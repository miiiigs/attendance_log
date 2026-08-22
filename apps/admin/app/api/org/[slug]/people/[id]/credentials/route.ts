import { NextResponse } from "next/server";
import { requireOrgAdminApiContext } from "../../../../../../../lib/org-auth";
import { generateTemporaryPassword } from "../../../../../../../lib/passwords";
import {
  attemptAutomatedOnboardingEmail,
  buildOnboardingEmail,
} from "../../../../../../../lib/server/onboarding-email";
import { createSupabaseServiceClient } from "../../../../../../../lib/supabase/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const adminContext = await requireOrgAdminApiContext(slug);

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = adminContext.organization;
  const supabase = createSupabaseServiceClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, username")
    .eq("organization_id", organization.id)
    .eq("user_id", id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Person not found in this organization." }, { status: 404 });
  }

  const { data: person, error: personError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("id", id)
    .maybeSingle();

  if (personError || !person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: "retry" | "regenerate"; password?: string };
  const nextPassword =
    body.mode === "retry" && body.password && /^[A-Za-z0-9]{12}$/.test(body.password)
      ? body.password
      : generateTemporaryPassword();

  if (body.mode !== "retry" || nextPassword !== body.password) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      password: nextPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  const onboardingEmail = buildOnboardingEmail({
    organizationName: organization.name,
    organizationCode: organization.code,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    username: membership.username,
    temporaryPassword: nextPassword,
  });

  const delivery = await attemptAutomatedOnboardingEmail({
    organizationName: organization.name,
    organizationCode: organization.code,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    username: membership.username,
    temporaryPassword: nextPassword,
    ...onboardingEmail,
  });

  return NextResponse.json({
    ok: true,
    username: membership.username,
    temporaryPassword: nextPassword,
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
