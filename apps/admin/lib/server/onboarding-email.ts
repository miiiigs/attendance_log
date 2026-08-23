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
  temporaryPassword?: string | null;
  organizationName?: string | null;
  organizationCode?: string | null;
  useExistingPassword?: boolean;
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
  const subject = "Your Activity Log credentials";

  const lines = [
    `Hello ${input.firstName},`,
    "",
    "Your Activity Log access is ready.",
  ];

  if (input.organizationName?.trim()) {
    lines.push("", "Organization:", input.organizationName.trim());
  }

  if (input.organizationCode?.trim()) {
    lines.push("", "Organization Code:", input.organizationCode.trim().toUpperCase());
  }

  lines.push("", "Username:", input.username);

  if (input.temporaryPassword) {
    lines.push("", "Temporary Password:", input.temporaryPassword);
  }

  lines.push("");

  if (input.temporaryPassword) {
    lines.push("Use these credentials to sign in to the Activity Log application.");
  } else if (input.useExistingPassword) {
    lines.push("Use your existing Activity Log password to sign in to this organization.");
  } else {
    lines.push("Use your Activity Log credentials to sign in to this organization.");
  }

  lines.push(
    "",
    "Please keep your login details private and do not share them with anyone.",
    "",
    "If you have trouble accessing your account, please contact your administrator.",
  );

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Hello ${escapeHtml(input.firstName)},</p>
      <p>Your Activity Log access is ready.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        ${
          input.temporaryPassword
            ? `<p style="margin: 0;"><strong>Temporary Password</strong><br />${escapeHtml(input.temporaryPassword)}</p>`
            : input.useExistingPassword
              ? `<p style="margin: 0;">Use your existing Activity Log password to sign in to this organization.</p>`
              : ""
        }
      </div>
      <p>${
        input.temporaryPassword
          ? "Use these credentials to sign in to the Activity Log application."
          : input.useExistingPassword
            ? "Use your existing Activity Log password to sign in to this organization."
            : "Use your Activity Log credentials to sign in to this organization."
      }</p>
      <p>Please keep your login details private and do not share them with anyone.</p>
      <p>If you have trouble accessing your account, please contact your administrator.</p>
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
    temporaryPassword: input.temporaryPassword ?? undefined,
    organizationName: input.organizationName ?? undefined,
    organizationCode: input.organizationCode ?? undefined,
    useExistingPassword: input.useExistingPassword ?? false,
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
