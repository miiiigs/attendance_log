import { personCreateSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requirePlatformAdminApiContext } from "../../../../../../lib/auth";
import { generateTemporaryPassword } from "../../../../../../lib/passwords";
import {
  sendAdminOnboardingEmail,
  sendAdminPromotionEmail,
  sendExistingAdminEmail,
} from "../../../../../../lib/server/onboarding-email";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";
import { createSupabaseServiceClient } from "../../../../../../lib/supabase/service";

type ExistingProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
};

type ExistingMembership = {
  id: string;
  user_id: string;
  username: string;
  role: string;
  status: string;
};

type OnboardingPayload = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  organizationName: string;
  organizationCode: string;
};

function buildResponse(
  mode: "created" | "added" | "promoted",
  administrator: { userId: string; firstName: string; lastName: string; email: string; username: string },
  temporaryPassword: string | null,
  emailResult: Awaited<ReturnType<typeof sendAdminOnboardingEmail>>,
) {
  return {
    success: true,
    mode,
    administrator,
    temporaryPassword,
    onboarding: {
      deliveryStatus: emailResult.delivery.status,
      recipient: emailResult.content.recipient,
      subject: emailResult.content.subject,
      body: emailResult.content.textBody,
      fullEmail: emailResult.content.fullEmailText,
      reason: emailResult.delivery.status === "sent" ? null : emailResult.delivery.reason,
    },
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requirePlatformAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = personCreateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid administrator payload." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const serviceSupabase = createSupabaseServiceClient();
  const userScopedSupabase = await createSupabaseServerClient();

  const { data: organization } = await serviceSupabase
    .from("organizations")
    .select("id, name, code, slug, status")
    .eq("id", id)
    .maybeSingle();

  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  if (organization.status !== "active") {
    return NextResponse.json(
      { error: "Only active organizations can have administrators assigned." },
      { status: 409 },
    );
  }

  const { data: existingProfile } = await serviceSupabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .ilike("email", email)
    .maybeSingle<ExistingProfile>();

  if (existingProfile && existingProfile.status !== "active") {
    return NextResponse.json({ error: "The existing QRLog account for this email is inactive." }, { status: 400 });
  }

  const payload: OnboardingPayload = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email,
    username: "",
    organizationName: organization.name,
    organizationCode: organization.code,
  };

  if (existingProfile) {
    const { data: existingMembership } = await serviceSupabase
      .from("organization_memberships")
      .select("id, user_id, username, role, status")
      .eq("organization_id", id)
      .eq("user_id", existingProfile.id)
      .maybeSingle<ExistingMembership>();

    if (existingMembership) {
      if (existingMembership.role === "organization_admin") {
        return NextResponse.json(
          { error: "This person is already an organization administrator." },
          { status: 409 },
        );
      }

      // CASE C — promote an existing member. Assign the next administrator
      // username and update role + username atomically (preserve membership id,
      // user id, password, and all history).
      const { data: adminUsername, error: adminUsernameError } = await userScopedSupabase.rpc("generate_membership_username", {
        target_organization_id: id,
        target_role: "organization_admin",
      });

      if (adminUsernameError || typeof adminUsername !== "string") {
        return NextResponse.json({ error: adminUsernameError?.message ?? "Unable to generate administrator username." }, { status: 400 });
      }

      const { data: updatedMembership, error: updateError } = await serviceSupabase
        .from("organization_memberships")
        .update({ role: "organization_admin", username: adminUsername })
        .eq("id", existingMembership.id)
        .select("id, username, role, status")
        .maybeSingle();

      if (updateError || !updatedMembership) {
        return NextResponse.json({ error: updateError?.message ?? "Unable to promote the membership." }, { status: 400 });
      }

      const emailResult = await sendAdminPromotionEmail({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
        username: adminUsername,
        organizationName: organization.name,
        organizationCode: organization.code,
      });

      return NextResponse.json(
        buildResponse(
          "promoted",
          { userId: existingProfile.id, ...parsed.data, email, username: adminUsername },
          null,
          emailResult,
        ),
      );
    }
  }

  const { data: username, error: usernameError } = await userScopedSupabase.rpc("generate_membership_username", {
    target_organization_id: id,
    target_role: "organization_admin",
  });

  if (usernameError || typeof username !== "string") {
    return NextResponse.json({ error: usernameError?.message ?? "Unable to generate username." }, { status: 400 });
  }

  payload.username = username;

  if (existingProfile) {
    // CASE B — existing global user, no membership in this organization.
    const { error: membershipError } = await serviceSupabase.from("organization_memberships").insert({
      organization_id: id,
      user_id: existingProfile.id,
      username,
      role: "organization_admin",
      status: "active",
    });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message ?? "Unable to create the administrator membership." }, { status: 400 });
    }

    const emailResult = await sendExistingAdminEmail({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      username,
      organizationName: organization.name,
      organizationCode: organization.code,
    });

    return NextResponse.json(
      buildResponse("added", { userId: existingProfile.id, ...parsed.data, email, username }, null, emailResult),
    );
  }

  // CASE A — completely new QRLog user.
  const temporaryPassword = generateTemporaryPassword();
  const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      username,
      contact_email: email,
    },
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? "Unable to create the administrator account." }, { status: 400 });
  }

  const userId = authUser.user.id;

  const { error: profileError } = await serviceSupabase.from("profiles").insert({
    id: userId,
    username,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email,
    role: "person",
    status: "active",
  });

  if (profileError) {
    await serviceSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message ?? "Unable to create the administrator profile." }, { status: 400 });
  }

  const { error: membershipError } = await serviceSupabase.from("organization_memberships").insert({
    organization_id: id,
    user_id: userId,
    username,
    role: "organization_admin",
    status: "active",
  });

  if (membershipError) {
    await serviceSupabase.from("profiles").delete().eq("id", userId);
    await serviceSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: membershipError.message ?? "Unable to create the administrator membership." }, { status: 400 });
  }

  const emailResult = await sendAdminOnboardingEmail({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email,
    username,
    temporaryPassword,
    organizationName: organization.name,
    organizationCode: organization.code,
  });

  const manualTemporaryPassword = emailResult.delivery.status !== "sent" ? temporaryPassword : null;

  return NextResponse.json(
    buildResponse("created", { userId, ...parsed.data, email, username }, manualTemporaryPassword, emailResult),
  );
}
