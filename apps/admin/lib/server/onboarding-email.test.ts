import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendMock,
    },
  })),
}));

describe("onboarding-email", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalFromName = process.env.RESEND_FROM_NAME;
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "accounts@example.com";
    process.env.RESEND_FROM_NAME = "QRLog";
    process.env.APP_BASE_URL = "https://qrlogph.vercel.app";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
    process.env.RESEND_FROM_NAME = originalFromName;
    process.env.APP_BASE_URL = originalAppBaseUrl;
  });

  it("builds a new-user onboarding email with credentials and login instructions", async () => {
    const { buildOnboardingEmail } = await import("./onboarding-email");
    const email = buildOnboardingEmail({
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "TEMP_PASSWORD_FOR_TESTS",
      organizationName: "ABC Company",
      organizationCode: "ABCCO",
    });

    expect(email.subject).toBe("Your QRLog account is ready");
    expect(email.textBody).toContain("Welcome Juan,");
    expect(email.textBody).toContain("ABCCO");
    expect(email.textBody).toContain("202600001");
    expect(email.textBody).toContain("TEMP_PASSWORD_FOR_TESTS");
    expect(email.textBody).toContain("https://qrlogph.vercel.app/login");
    expect(email.textBody).toContain("Please change your password after your first login.");
  });

  it("builds an existing-user membership email without a password", async () => {
    const { buildExistingMembershipEmail } = await import("./onboarding-email");
    const email = buildExistingMembershipEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      organizationName: "ABC Company",
      organizationCode: "ABCCO",
    });

    expect(email.subject).toBe("You've been added to ABC Company");
    expect(email.textBody).toContain("Use your existing QRLog password.");
    expect(email.textBody).not.toContain("Temporary Password");
    expect(email.htmlBody).not.toContain("Temporary Password");
  });

  it("sends onboarding email through Resend when configured", async () => {
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const { sendOnboardingEmail } = await import("./onboarding-email");

    const result = await sendOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "TEMP_PASSWORD_FOR_TESTS",
      organizationName: "Example Company",
      organizationCode: "EXAMPLE",
    });

    expect(result.delivery).toEqual({ status: "sent" });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "QRLog <accounts@example.com>",
        to: "juan@example.com",
        subject: "Your QRLog account is ready",
      }),
    );
  });

  it("returns not configured when resend env vars are incomplete", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendOnboardingEmail } = await import("./onboarding-email");

    const result = await sendOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "TEMP_PASSWORD_FOR_TESTS",
    });

    expect(result.delivery).toEqual({
      status: "not_configured",
      reason: "Transactional email is not configured.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns failed when Resend reports an email error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "recipient rejected" },
    });
    const { sendExistingMembershipEmail } = await import("./onboarding-email");

    const result = await sendExistingMembershipEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      organizationName: "Example Company",
      organizationCode: "EXAMPLE",
    });

    expect(result.delivery).toEqual({
      status: "failed",
      reason: "Automated email could not be sent.",
    });
  });
});
