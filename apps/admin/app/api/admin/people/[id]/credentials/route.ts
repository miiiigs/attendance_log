import { NextResponse } from "next/server";
import { getOrganizationName, getPersonByIdForCredentials } from "../../../../../../lib/people";
import { generateTemporaryPassword } from "../../../../../../lib/passwords";
import {
  attemptAutomatedOnboardingEmail,
  buildOnboardingEmail,
} from "../../../../../../lib/server/onboarding-email";
import { requireAdminApiContext } from "../../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../../lib/supabase/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await requireAdminApiContext();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { mode?: "retry" | "regenerate"; password?: string };
  const person = await getPersonByIdForCredentials(id);

  if (!person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }

  const supabase = createSupabaseServiceClient();
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

  const organizationName = await getOrganizationName();
  const onboardingEmail = buildOnboardingEmail({
    organizationName,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    username: person.username,
    temporaryPassword: nextPassword,
  });
  const delivery = await attemptAutomatedOnboardingEmail({
    organizationName,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    username: person.username,
    temporaryPassword: nextPassword,
    ...onboardingEmail,
  });

  return NextResponse.json({
    ok: true,
    username: person.username,
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
