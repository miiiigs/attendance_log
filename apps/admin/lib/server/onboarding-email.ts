import { APP_NAME } from "@attendance/shared";
import { Resend } from "resend";
import { getOptionalResendConfig } from "../env";

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

export interface BuildExistingMembershipEmailInput {
  firstName: string;
  lastName?: string | null;
  email: string;
  username: string;
  organizationName?: string | null;
  organizationCode?: string | null;
}

type EmailVariant = "onboarding" | "membership" | "admin-onboarding" | "existing-admin" | "admin-promotion";

export interface SendEmailResult {
  content: OnboardingEmailContent;
  delivery: OnboardingDeliveryResult;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSender(fromEmail: string, fromName: string) {
  return `${fromName} <${fromEmail}>`;
}

function getLoginUrl() {
  const config = getOptionalResendConfig();
  if (!config) {
    return null;
  }

  return `${config.appBaseUrl}/login`;
}

export function buildOnboardingEmail(input: BuildOnboardingEmailInput): OnboardingEmailContent {
  const loginUrl = getLoginUrl();
  const subject = "Your QRLog account is ready";

  const lines = [
    `Welcome ${input.firstName},`,
    "",
    "Your QRLog access is ready.",
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

  if (loginUrl) {
    lines.push("", "Login URL:", loginUrl);
  }

  lines.push("");

  if (input.temporaryPassword) {
    lines.push("Use these credentials to sign in to the QRLog application.");
  } else if (input.useExistingPassword) {
    lines.push("Use your existing QRLog password to sign in to this organization.");
  } else {
    lines.push("Use your QRLog credentials to sign in to this organization.");
  }

  lines.push(
    "",
    "Please change your password after your first login.",
    "",
    "Please keep your login details private and do not share them with anyone.",
    "",
    "If you have trouble accessing your account, please contact your administrator.",
  );

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Welcome ${escapeHtml(input.firstName)},</p>
      <p>Your QRLog access is ready.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        ${
          input.temporaryPassword
            ? `<p style="margin: 0;"><strong>Temporary Password</strong><br />${escapeHtml(input.temporaryPassword)}</p>`
            : input.useExistingPassword
              ? `<p style="margin: 0;">Use your existing QRLog password to sign in to this organization.</p>`
              : ""
        }
      </div>
      <p>${
        input.temporaryPassword
          ? "Use these credentials to sign in to the QRLog application."
          : input.useExistingPassword
            ? "Use your existing QRLog password to sign in to this organization."
            : "Use your QRLog credentials to sign in to this organization."
      }</p>
      ${loginUrl ? `<p><strong>Login URL</strong><br /><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
      <p>Please change your password after your first login.</p>
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

export function buildAdminOnboardingEmail(input: BuildOnboardingEmailInput): OnboardingEmailContent {
  const loginUrl = getLoginUrl();
  const subject = "Your QRLog administrator account is ready";

  const lines = [
    `Welcome ${input.firstName},`,
    "",
    "Your QRLog administrator access is ready.",
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

  if (loginUrl) {
    lines.push("", "Login URL:", loginUrl);
  }

  lines.push(
    "",
    "Use these credentials to sign in to the QRLog application.",
    "",
    "Please change your password after your first login.",
    "",
    "Please keep your login details private and do not share them with anyone.",
    "",
    "If you have trouble accessing your account, please contact your platform administrator.",
  );

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Welcome ${escapeHtml(input.firstName)},</p>
      <p>Your QRLog administrator access is ready.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        ${input.temporaryPassword ? `<p style="margin: 0;"><strong>Temporary Password</strong><br />${escapeHtml(input.temporaryPassword)}</p>` : ""}
      </div>
      <p>Use these credentials to sign in to the QRLog application.</p>
      ${loginUrl ? `<p><strong>Login URL</strong><br /><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
      <p>Please change your password after your first login.</p>
      <p>Please keep your login details private and do not share them with anyone.</p>
      <p>If you have trouble accessing your account, please contact your platform administrator.</p>
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

export function buildExistingAdminEmail(input: BuildExistingMembershipEmailInput): OnboardingEmailContent {
  const loginUrl = getLoginUrl();
  const organizationLabel = input.organizationName?.trim() || APP_NAME;
  const subject = `You've been added as an administrator to ${organizationLabel}`;

  const lines = [
    `Hello ${input.firstName},`,
    "",
    `You've been added as an administrator to ${input.organizationName?.trim() || "a QRLog organization"}.`,
  ];

  if (input.organizationName?.trim()) {
    lines.push("", "Organization:", input.organizationName.trim());
  }

  if (input.organizationCode?.trim()) {
    lines.push("", "Organization Code:", input.organizationCode.trim().toUpperCase());
  }

  lines.push("", "Username:", input.username, "", "Use your existing QRLog password.", "");

  if (loginUrl) {
    lines.push("Login URL:", loginUrl, "");
  }

  lines.push("If you have trouble accessing your account, please contact your platform administrator.");

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Hello ${escapeHtml(input.firstName)},</p>
      <p>You've been added as an administrator to ${escapeHtml(input.organizationName?.trim() || "a QRLog organization")}.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        <p style="margin: 0;">Use your existing QRLog password.</p>
      </div>
      ${loginUrl ? `<p><strong>Login URL</strong><br /><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
      <p>If you have trouble accessing your account, please contact your platform administrator.</p>
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

export function buildAdminPromotionEmail(input: BuildExistingMembershipEmailInput): OnboardingEmailContent {
  const loginUrl = getLoginUrl();
  const organizationLabel = input.organizationName?.trim() || APP_NAME;
  const subject = `You now have administrator access to ${organizationLabel}`;

  const lines = [
    `Hello ${input.firstName},`,
    "",
    `You now have administrator access to ${input.organizationName?.trim() || "a QRLog organization"}.`,
  ];

  if (input.organizationName?.trim()) {
    lines.push("", "Organization:", input.organizationName.trim());
  }

  if (input.organizationCode?.trim()) {
    lines.push("", "Organization Code:", input.organizationCode.trim().toUpperCase());
  }

  lines.push("", "Username:", input.username, "", "Use your existing QRLog password.", "");

  if (loginUrl) {
    lines.push("Login URL:", loginUrl, "");
  }

  lines.push("If you have trouble accessing your account, please contact your platform administrator.");

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Hello ${escapeHtml(input.firstName)},</p>
      <p>You now have administrator access to ${escapeHtml(input.organizationName?.trim() || "a QRLog organization")}.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        <p style="margin: 0;">Use your existing QRLog password.</p>
      </div>
      ${loginUrl ? `<p><strong>Login URL</strong><br /><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
      <p>If you have trouble accessing your account, please contact your platform administrator.</p>
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

export function buildExistingMembershipEmail(input: BuildExistingMembershipEmailInput): OnboardingEmailContent {
  const loginUrl = getLoginUrl();
  const subject = `You've been added to ${input.organizationName?.trim() || APP_NAME}`;
  const lines = [
    `Hello ${input.firstName},`,
    "",
    `You've been added to ${input.organizationName?.trim() || "a new QRLog organization"}.`,
  ];

  if (input.organizationName?.trim()) {
    lines.push("", "Organization:", input.organizationName.trim());
  }

  if (input.organizationCode?.trim()) {
    lines.push("", "Organization Code:", input.organizationCode.trim().toUpperCase());
  }

  lines.push("", "Username:", input.username, "", "Use your existing QRLog password.", "");

  if (loginUrl) {
    lines.push("Login URL:", loginUrl, "");
  }

  lines.push("If you have trouble accessing your account, please contact your administrator.");

  const textBody = lines.join("\n");
  const fullEmailText = `To: ${input.email}\nSubject: ${subject}\n\n${textBody}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #172220; line-height: 1.6;">
      <p>Hello ${escapeHtml(input.firstName)},</p>
      <p>You've been added to ${escapeHtml(input.organizationName?.trim() || "a new QRLog organization")}.</p>
      <div style="border: 1px solid #d7d2c6; border-radius: 16px; padding: 16px; background: #f8f4ec;">
        ${input.organizationName?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization</strong><br />${escapeHtml(input.organizationName.trim())}</p>` : ""}
        ${input.organizationCode?.trim() ? `<p style="margin: 0 0 12px;"><strong>Organization Code</strong><br />${escapeHtml(input.organizationCode.trim().toUpperCase())}</p>` : ""}
        <p style="margin: 0 0 12px;"><strong>Username</strong><br />${escapeHtml(input.username)}</p>
        <p style="margin: 0;">Use your existing QRLog password.</p>
      </div>
      ${loginUrl ? `<p><strong>Login URL</strong><br /><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
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

async function sendTransactionalEmail(
  variant: EmailVariant,
  content: OnboardingEmailContent,
  metadata: { email: string; username: string },
): Promise<OnboardingDeliveryResult> {
  const config = getOptionalResendConfig();

  if (!config) {
    return {
      status: "not_configured",
      reason: "Transactional email is not configured.",
    };
  }

  const resend = new Resend(config.apiKey);

  try {
    const response = await resend.emails.send({
      from: formatSender(config.fromEmail, config.fromName || APP_NAME),
      to: content.recipient,
      subject: content.subject,
      text: content.textBody,
      html: content.htmlBody,
    });

    if (response.error) {
      console.warn(`Resend ${variant} email failed for ${metadata.username} / ${metadata.email}.`);
      return {
        status: "failed",
        reason: "Automated email could not be sent.",
      };
    }

    return { status: "sent" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Resend ${variant} email timed out for ${metadata.username} / ${metadata.email}.`);
    } else {
      console.warn(`Resend ${variant} email unavailable for ${metadata.username} / ${metadata.email}.`);
    }

    return {
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    };
  }
}

export async function sendOnboardingEmail(input: BuildOnboardingEmailInput): Promise<SendEmailResult> {
  const content = buildOnboardingEmail(input);
  const delivery = await sendTransactionalEmail("onboarding", content, {
    email: input.email,
    username: input.username,
  });

  return { content, delivery };
}

export async function sendExistingMembershipEmail(
  input: BuildExistingMembershipEmailInput,
): Promise<SendEmailResult> {
  const content = buildExistingMembershipEmail(input);
  const delivery = await sendTransactionalEmail("membership", content, {
    email: input.email,
    username: input.username,
  });

  return { content, delivery };
}

export async function sendAdminOnboardingEmail(input: BuildOnboardingEmailInput): Promise<SendEmailResult> {
  const content = buildAdminOnboardingEmail(input);
  const delivery = await sendTransactionalEmail("admin-onboarding", content, {
    email: input.email,
    username: input.username,
  });

  return { content, delivery };
}

export async function sendExistingAdminEmail(
  input: BuildExistingMembershipEmailInput,
): Promise<SendEmailResult> {
  const content = buildExistingAdminEmail(input);
  const delivery = await sendTransactionalEmail("existing-admin", content, {
    email: input.email,
    username: input.username,
  });

  return { content, delivery };
}

export async function sendAdminPromotionEmail(
  input: BuildExistingMembershipEmailInput,
): Promise<SendEmailResult> {
  const content = buildAdminPromotionEmail(input);
  const delivery = await sendTransactionalEmail("admin-promotion", content, {
    email: input.email,
    username: input.username,
  });

  return { content, delivery };
}
