import { personCreateSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { getOrganizationName } from "../../../../lib/people";
import { generateTemporaryPassword } from "../../../../lib/passwords";
import {
  attemptAutomatedOnboardingEmail,
  buildOnboardingEmail,
} from "../../../../lib/server/onboarding-email";
import { requireAdminApiContext } from "../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

async function generateUsername(supabase: { rpc: (fn: string, args?: object) => unknown }) {
  const targetYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
    }).format(new Date()),
  );

  const preferredAttempt = (await supabase.rpc("generate_next_username", {
    target_year: targetYear,
  })) as {
    data: string | null;
    error: { message?: string } | null;
  };

  if (typeof preferredAttempt.data === "string" && !preferredAttempt.error) {
    return preferredAttempt;
  }

  if (
    preferredAttempt.error?.message?.includes("Could not find the function public.generate_next_username(target_year)")
  ) {
    return (await supabase.rpc("generate_next_username")) as {
      data: string | null;
      error: { message?: string } | null;
    };
  }

  return preferredAttempt;
}

export async function POST(request: Request) {
  const context = await requireAdminApiContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = personCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid person payload." }, { status: 400 });
  }

  const userScopedSupabase = await createSupabaseServerClient();
  const { data: username, error: usernameError } = await generateUsername(userScopedSupabase);

  if (usernameError || typeof username !== "string") {
    return NextResponse.json({ error: usernameError?.message ?? "Unable to generate username." }, { status: 400 });
  }

  const { data: organizationId, error: organizationIdError } = await userScopedSupabase.rpc(
    "get_default_organization_id",
  );

  if (organizationIdError || typeof organizationId !== "string") {
    return NextResponse.json(
      { error: organizationIdError?.message ?? "No active organization context found." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  const temporaryPassword = generateTemporaryPassword();
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      username,
      contact_email: parsed.data.email,
    },
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? "Unable to create auth user." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: authUser.user.id,
      username,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      role: "person",
      status: "active",
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: profileError?.message ?? "Unable to create profile." }, { status: 400 });
  }

  const { error: membershipError } = await supabase.from("organization_memberships").insert({
    organization_id: organizationId,
    user_id: authUser.user.id,
    username,
    role: "member",
    status: "active",
  });

  if (membershipError) {
    await supabase.from("profiles").delete().eq("id", authUser.user.id);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: membershipError.message ?? "Unable to create membership." }, { status: 400 });
  }

  const organizationName = await getOrganizationName();
  const onboardingEmail = buildOnboardingEmail({
    organizationName,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    username,
    temporaryPassword,
  });
  const delivery = await attemptAutomatedOnboardingEmail({
    organizationName,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    username,
    temporaryPassword,
    ...onboardingEmail,
  });

  return NextResponse.json({
    success: true,
    person: {
      id: profile.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      username,
    },
    temporaryPassword,
    onboarding: {
      deliveryStatus: delivery.status,
      recipient: onboardingEmail.recipient,
      subject: onboardingEmail.subject,
      body: onboardingEmail.textBody,
      fullEmail: onboardingEmail.fullEmailText,
      reason: delivery.status === "sent" ? null : delivery.reason,
    },
  });
}
