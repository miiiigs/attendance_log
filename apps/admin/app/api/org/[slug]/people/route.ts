import { personCreateSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../lib/org-auth";
import { generateTemporaryPassword } from "../../../../../lib/passwords";
import {
  sendExistingMembershipEmail,
  sendOnboardingEmail,
} from "../../../../../lib/server/onboarding-email";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = personCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid person payload." }, { status: 400 });
  }

  const organizationId = adminContext.organization.id;
  const organization = adminContext.organization;

  const userScopedSupabase = adminContext.supabase;
  const { data: username, error: usernameError } = await userScopedSupabase.rpc("generate_next_membership_username", {
    target_organization_id: organizationId,
  });

  if (usernameError || typeof username !== "string") {
    return NextResponse.json({ error: usernameError?.message ?? "Unable to generate username." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Existing-user reuse: if the email already belongs to a global Auth user,
  // reuse that identity and create only a new membership (no password reset).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("email", parsed.data.email)
    .maybeSingle();

  let userId: string;
  let temporaryPassword: string | null = null;
  let createdAuthUser = false;

  if (existingProfile) {
    if (existingProfile.status !== "active") {
      return NextResponse.json({ error: "The existing account for this email is inactive." }, { status: 400 });
    }
    userId = existingProfile.id;
  } else {
    temporaryPassword = generateTemporaryPassword();
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

    userId = authUser.user.id;
    createdAuthUser = true;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      role: "person",
      status: "active",
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message ?? "Unable to create profile." }, { status: 400 });
    }
  }

  const { error: membershipError } = await supabase.from("organization_memberships").insert({
    organization_id: organizationId,
    user_id: userId,
    username,
    role: "member",
    status: "active",
  });

  if (membershipError) {
    if (createdAuthUser) {
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
    }
    return NextResponse.json({ error: membershipError.message ?? "Unable to create membership." }, { status: 400 });
  }

  const emailResult = temporaryPassword
    ? await sendOnboardingEmail({
        organizationName: organization.name,
        organizationCode: organization.code,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        username,
        temporaryPassword,
      })
    : await sendExistingMembershipEmail({
        organizationName: organization.name,
        organizationCode: organization.code,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        username,
      });

  const manualTemporaryPassword = temporaryPassword && emailResult.delivery.status !== "sent" ? temporaryPassword : null;

  return NextResponse.json({
    success: true,
    person: {
      id: userId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      username,
    },
    usedExistingAccount: !temporaryPassword,
    temporaryPassword: manualTemporaryPassword,
    onboarding: {
      deliveryStatus: emailResult.delivery.status,
      recipient: emailResult.content.recipient,
      subject: emailResult.content.subject,
      body: emailResult.content.textBody,
      fullEmail: emailResult.content.fullEmailText,
      reason: emailResult.delivery.status === "sent" ? null : emailResult.delivery.reason,
    },
  });
}
