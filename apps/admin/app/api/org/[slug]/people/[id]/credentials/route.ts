import { NextResponse } from "next/server";
import {
  sendExistingMembershipEmail,
  sendOnboardingEmail,
} from "../../../../../../../lib/server/onboarding-email";
import { requireOrgAdminApiContext } from "../../../../../../../lib/org-auth";
import { generateTemporaryPassword, isTemporaryPassword } from "../../../../../../../lib/passwords";
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

  const body = (await request.json().catch(() => ({}))) as {
    mode?: "notify" | "retry" | "regenerate";
    password?: string;
  };

  if (body.mode === "notify") {
    const emailResult = await sendExistingMembershipEmail({
      organizationName: organization.name,
      organizationCode: organization.code,
      firstName: person.first_name,
      lastName: person.last_name,
      email: person.email,
      username: membership.username,
    });

    return NextResponse.json({
      ok: true,
      username: membership.username,
      temporaryPassword: null,
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

  const requestedPassword = body.mode === "retry" && body.password && isTemporaryPassword(body.password) ? body.password : null;
  const nextPassword = requestedPassword ?? generateTemporaryPassword();

  if (body.mode !== "retry" || nextPassword !== requestedPassword) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      password: nextPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  const emailResult = await sendOnboardingEmail({
    organizationName: organization.name,
    organizationCode: organization.code,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    username: membership.username,
    temporaryPassword: nextPassword,
  });

  const manualTemporaryPassword = emailResult.delivery.status === "sent" ? null : nextPassword;

  return NextResponse.json({
    ok: true,
    username: membership.username,
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
