import { organizationApprovalSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requirePlatformAdminApiContext } from "../../../../../../lib/auth";
import { buildOrganizationSlug } from "../../../../../../lib/organizations";
import { generateTemporaryPassword } from "../../../../../../lib/passwords";
import {
  attemptAutomatedOnboardingEmail,
  buildOnboardingEmail,
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requirePlatformAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = organizationApprovalSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid approval payload." }, { status: 400 });
  }

  const userScopedSupabase = await createSupabaseServerClient();
  const serviceSupabase = createSupabaseServiceClient();

  const { data: application, error: applicationError } = await userScopedSupabase
    .from("organization_applications")
    .select("id, status, contact_first_name, contact_last_name, contact_email")
    .eq("id", id)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 400 });
  }

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: "Only pending applications can be approved." }, { status: 409 });
  }

  const { data: existingProfile } = await serviceSupabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("email", parsed.data.administratorEmail)
    .maybeSingle<ExistingProfile>();

  if (existingProfile && existingProfile.status !== "active") {
    return NextResponse.json({ error: "The existing platform user for this email is inactive." }, { status: 400 });
  }

  let createdUserId: string | null = null;
  let createdOrganizationId: string | null = null;
  let temporaryPassword: string | null = null;

  try {
    let userId = existingProfile?.id ?? null;

    if (!userId) {
      temporaryPassword = generateTemporaryPassword();
      const { data: createdAuthUser, error: createAuthUserError } = await serviceSupabase.auth.admin.createUser({
        email: parsed.data.administratorEmail,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (createAuthUserError || !createdAuthUser.user) {
        return NextResponse.json({ error: createAuthUserError?.message ?? "Unable to create the administrator account." }, { status: 400 });
      }

      createdUserId = createdAuthUser.user.id;
      userId = createdAuthUser.user.id;

      const { error: profileInsertError } = await serviceSupabase.from("profiles").insert({
        id: userId,
        username: parsed.data.organizationCode.toLowerCase(),
        first_name: parsed.data.administratorFirstName,
        last_name: parsed.data.administratorLastName,
        email: parsed.data.administratorEmail,
        role: "person",
        status: "active",
      });

      if (profileInsertError) {
        await serviceSupabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
      }
    }

    const { data: organization, error: organizationError } = await userScopedSupabase
      .from("organizations")
      .insert({
        name: parsed.data.organizationName,
        code: parsed.data.organizationCode,
        slug: buildOrganizationSlug(parsed.data.organizationName, parsed.data.organizationCode),
        status: "active",
        timezone: parsed.data.timezone,
        approved_by: adminContext.profile.id,
        approved_at: new Date().toISOString(),
      })
      .select("id, name, code, slug")
      .single();

    if (organizationError || !organization) {
      if (createdUserId) {
        await serviceSupabase.auth.admin.deleteUser(createdUserId);
      }

      return NextResponse.json({ error: organizationError?.message ?? "Unable to create the organization." }, { status: 400 });
    }

    createdOrganizationId = organization.id;

    const { data: generatedUsername, error: usernameError } = await userScopedSupabase.rpc("generate_next_membership_username", {
      target_organization_id: organization.id,
    });

    if (usernameError || typeof generatedUsername !== "string") {
      await serviceSupabase.from("organizations").delete().eq("id", organization.id);
      if (createdUserId) {
        await serviceSupabase.auth.admin.deleteUser(createdUserId);
      }

      return NextResponse.json({ error: usernameError?.message ?? "Unable to generate an organization username." }, { status: 400 });
    }

    const { error: membershipError } = await userScopedSupabase.from("organization_memberships").insert({
      organization_id: organization.id,
      user_id: userId,
      username: generatedUsername,
      role: "organization_admin",
      status: "active",
    });

    if (membershipError) {
      await serviceSupabase.from("organizations").delete().eq("id", organization.id);
      if (createdUserId) {
        await serviceSupabase.auth.admin.deleteUser(createdUserId);
      }

      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    const { error: applicationUpdateError } = await userScopedSupabase
      .from("organization_applications")
      .update({
        status: "approved",
        reviewed_by: adminContext.profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (applicationUpdateError) {
      await serviceSupabase.from("organizations").delete().eq("id", organization.id);
      if (createdUserId) {
        await serviceSupabase.auth.admin.deleteUser(createdUserId);
      }

      return NextResponse.json({ error: applicationUpdateError.message }, { status: 400 });
    }

    const onboardingEmail = buildOnboardingEmail({
      firstName: parsed.data.administratorFirstName,
      lastName: parsed.data.administratorLastName,
      email: parsed.data.administratorEmail,
      username: generatedUsername,
      temporaryPassword,
      organizationName: organization.name,
      organizationCode: organization.code,
      useExistingPassword: !temporaryPassword,
    });

    const delivery = await attemptAutomatedOnboardingEmail({
      firstName: parsed.data.administratorFirstName,
      lastName: parsed.data.administratorLastName,
      email: parsed.data.administratorEmail,
      username: generatedUsername,
      temporaryPassword,
      organizationName: organization.name,
      organizationCode: organization.code,
      useExistingPassword: !temporaryPassword,
      ...onboardingEmail,
    });

    return NextResponse.json({
      ok: true,
      organization,
      administrator: {
        email: parsed.data.administratorEmail,
        username: generatedUsername,
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
  } catch (error) {
    if (createdOrganizationId) {
      await serviceSupabase.from("organizations").delete().eq("id", createdOrganizationId);
    }

    if (createdUserId) {
      await serviceSupabase.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to approve the application.",
      },
      { status: 500 },
    );
  }
}
