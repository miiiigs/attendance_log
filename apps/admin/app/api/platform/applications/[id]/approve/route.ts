import { organizationApprovalSchema } from "@attendance/shared";
import { NextResponse } from "next/server";
import { requirePlatformAdminApiContext } from "../../../../../../lib/auth";
import { buildOrganizationSlug } from "../../../../../../lib/organizations";
import { generateTemporaryPassword } from "../../../../../../lib/passwords";
import {
  sendExistingMembershipEmail,
  sendOnboardingEmail,
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

async function cleanupProvisioning(
  serviceSupabase: ReturnType<typeof createSupabaseServiceClient>,
  input: {
    createdOrganizationId: string | null;
    createdProfileId: string | null;
    createdUserId: string | null;
  },
) {
  if (input.createdOrganizationId) {
    await serviceSupabase.from("organizations").delete().eq("id", input.createdOrganizationId);
  }

  if (input.createdProfileId) {
    await serviceSupabase.from("profiles").delete().eq("id", input.createdProfileId);
  }

  if (input.createdUserId) {
    await serviceSupabase.auth.admin.deleteUser(input.createdUserId);
  }
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
  const parsed = organizationApprovalSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid approval payload." }, { status: 400 });
  }

  const userScopedSupabase = await createSupabaseServerClient();
  const serviceSupabase = createSupabaseServiceClient();
  const administratorEmail = parsed.data.administratorEmail.trim().toLowerCase();

  const { data: application, error: applicationError } = await userScopedSupabase
    .from("organization_applications")
    .select("id, status")
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
    .ilike("email", administratorEmail)
    .maybeSingle<ExistingProfile>();

  if (existingProfile && existingProfile.status !== "active") {
    return NextResponse.json({ error: "The existing Activity Log account for this email is inactive." }, { status: 400 });
  }

  if (existingProfile) {
    const { data: existingAuthUser, error: existingAuthUserError } = await serviceSupabase.auth.admin.getUserById(existingProfile.id);

    if (existingAuthUserError || !existingAuthUser.user) {
      return NextResponse.json(
        { error: "The existing Activity Log account for this email could not be reused safely." },
        { status: 409 },
      );
    }
  }

  let createdUserId: string | null = null;
  let createdProfileId: string | null = null;
  let createdOrganizationId: string | null = null;
  let temporaryPassword: string | null = null;

  try {
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
      if (organizationError?.code === "23505") {
        return NextResponse.json({ error: "Organization code is already in use." }, { status: 409 });
      }

      return NextResponse.json({ error: organizationError?.message ?? "Unable to create the organization." }, { status: 400 });
    }

    createdOrganizationId = organization.id;

    const { data: generatedUsername, error: usernameError } = await userScopedSupabase.rpc("generate_next_membership_username", {
      target_organization_id: organization.id,
    });

    if (usernameError || typeof generatedUsername !== "string") {
      await cleanupProvisioning(serviceSupabase, {
        createdOrganizationId,
        createdProfileId,
        createdUserId,
      });

      return NextResponse.json({ error: usernameError?.message ?? "Unable to generate an organization username." }, { status: 400 });
    }

    let userId = existingProfile?.id ?? null;

    if (!userId) {
      temporaryPassword = generateTemporaryPassword();
      const { data: createdAuthUser, error: createAuthUserError } = await serviceSupabase.auth.admin.createUser({
        email: administratorEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          contact_email: administratorEmail,
          username: parsed.data.organizationCode.toLowerCase(),
        },
      });

      if (createAuthUserError || !createdAuthUser.user) {
        await cleanupProvisioning(serviceSupabase, {
          createdOrganizationId,
          createdProfileId,
          createdUserId,
        });

        return NextResponse.json({ error: createAuthUserError?.message ?? "Unable to create the administrator account." }, { status: 400 });
      }

      createdUserId = createdAuthUser.user.id;
      userId = createdAuthUser.user.id;

      const { error: profileInsertError } = await serviceSupabase.from("profiles").insert({
        id: userId,
        username: parsed.data.organizationCode.toLowerCase(),
        first_name: parsed.data.administratorFirstName,
        last_name: parsed.data.administratorLastName,
        email: administratorEmail,
        role: "person",
        status: "active",
      });

      if (profileInsertError) {
        await cleanupProvisioning(serviceSupabase, {
          createdOrganizationId,
          createdProfileId,
          createdUserId,
        });

        return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
      }

      createdProfileId = userId;
    }

    const { error: membershipError } = await userScopedSupabase.from("organization_memberships").insert({
      organization_id: organization.id,
      user_id: userId,
      username: generatedUsername,
      role: "organization_admin",
      status: "active",
    });

    if (membershipError) {
      await cleanupProvisioning(serviceSupabase, {
        createdOrganizationId,
        createdProfileId,
        createdUserId,
      });

      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    const { data: approvedApplication, error: applicationUpdateError } = await userScopedSupabase
      .from("organization_applications")
      .update({
        status: "approved",
        reviewed_by: adminContext.profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (applicationUpdateError || !approvedApplication) {
      await cleanupProvisioning(serviceSupabase, {
        createdOrganizationId,
        createdProfileId,
        createdUserId,
      });

      return NextResponse.json(
        { error: applicationUpdateError?.message ?? "This application was already reviewed by another administrator." },
        { status: 409 },
      );
    }

    const emailResult = temporaryPassword
      ? await sendOnboardingEmail({
          firstName: parsed.data.administratorFirstName,
          lastName: parsed.data.administratorLastName,
          email: administratorEmail,
          username: generatedUsername,
          temporaryPassword,
          organizationName: organization.name,
          organizationCode: organization.code,
        })
      : await sendExistingMembershipEmail({
          firstName: parsed.data.administratorFirstName,
          lastName: parsed.data.administratorLastName,
          email: administratorEmail,
          username: generatedUsername,
          organizationName: organization.name,
          organizationCode: organization.code,
        });

    const manualTemporaryPassword = temporaryPassword && emailResult.delivery.status !== "sent" ? temporaryPassword : null;

    return NextResponse.json({
      ok: true,
      organization,
      administrator: {
        email: administratorEmail,
        name: `${parsed.data.administratorFirstName} ${parsed.data.administratorLastName}`,
        username: generatedUsername,
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
  } catch (error) {
    await cleanupProvisioning(serviceSupabase, {
      createdOrganizationId,
      createdProfileId,
      createdUserId,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to approve the application.",
      },
      { status: 500 },
    );
  }
}
