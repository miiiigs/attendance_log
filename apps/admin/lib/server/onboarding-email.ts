const EMAIL_TIMEOUT_MS = 4000;

export type OnboardingDeliveryResult =
  | {
      status: "sent";
    }
  | {
      status: "not_configured" | "unavailable" | "failed";
      reason: string;
    };

export interface BuildOnboardingEmailInput {
  firstName: string;
  lastName?: string | null;
  email: string;
  username: string;
  temporaryPassword: string;
  organizationName?: string | null;
}

export interface OnboardingEmailContent {
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  fullEmailText: string;
}

export interface AttemptAutomatedOnboardingEmailInput
  extends BuildOnboardingEmailInput,
    OnboardingEmailContent {}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getN8nConfig() {
  const url = process.env.N8N_ONBOARDING_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_ONBOARDING_WEBHOOK_SECRET?.trim();

  if (!url || !secret) {
    return null;
  }

  return { url, secret };
}

export function buildOnboardingEmail(input: BuildOnboardingEmailInput): OnboardingEmailContent {
  const subject = "Your SCPAA Attendance Account";

  const lines = [
    `Hello ${input.firstName},`,
    "",
    "Your attendance account has been created.",
    "",
    "Username:",
    input.username,
    "",
    "Temporary Password:",
    input.temporaryPassword,
    "",
    "Use these credentials to sign in to the Attendance mobile application.",
    "",
    "Please keep your username and password private and do not share them with anyone.",
    "",
    "If you have trouble accessing your account, please contact your administrator.",
  ];

  if (input.organizationName?.trim()) {
    lines.push("", input.organizationName.trim());
  }

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Hello ${escapeHtml(input.firstName)},</p>
      <p>Your attendance account has been created.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        <p style="margin: 0;"><strong>Temporary Password</strong><br />${escapeHtml(input.temporaryPassword)}</p>
      </div>
      <p>Use these credentials to sign in to the Attendance mobile application.</p>
      <p>Please keep your username and password private and do not share them with anyone.</p>
      <p>If you have trouble accessing your account, please contact your administrator.</p>
      ${input.organizationName?.trim() ? `<p>${escapeHtml(input.organizationName.trim())}</p>` : ""}
    </div>
  `.trim();

  return {
    recipient: input.email,
    subject,
    textBody,
    htmlBody,
    fullEmailText,
  };
}

function buildWebhookPayload(input: AttemptAutomatedOnboardingEmailInput) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

  return {
    event: "person.created",
    to: input.recipient,
    subject: input.subject,
    textBody: input.textBody,
    htmlBody: input.htmlBody,
    firstName: input.firstName,
    lastName: input.lastName ?? "",
    fullName,
    email: input.email,
    username: input.username,
    temporaryPassword: input.temporaryPassword,
    organizationName: input.organizationName ?? undefined,
  };
}

function mapFailure(status: number): OnboardingDeliveryResult {
  if (status >= 500) {
    return {
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    };
  }

  return {
    status: "failed",
    reason: "Automated email could not be sent.",
  };
}

export async function attemptAutomatedOnboardingEmail(
  input: AttemptAutomatedOnboardingEmailInput,
): Promise<OnboardingDeliveryResult> {
  const config = getN8nConfig();

  if (!config) {
    return {
      status: "not_configured",
      reason: "Automated onboarding email is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Attendance-Webhook-Secret": config.secret,
      },
      body: JSON.stringify(buildWebhookPayload(input)),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`Automated onboarding unavailable for ${input.username} / ${input.email} with status ${response.status}.`);
      return mapFailure(response.status);
    }

    return { status: "sent" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Automated onboarding timed out for ${input.username} / ${input.email}.`);
    } else {
      console.warn(`Automated onboarding unavailable for ${input.username} / ${input.email}.`);
    }

    return {
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
