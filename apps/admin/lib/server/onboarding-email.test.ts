import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attemptAutomatedOnboardingEmail, buildOnboardingEmail } from "./onboarding-email";

describe("onboarding-email", () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.N8N_ONBOARDING_WEBHOOK_URL;
  const originalSecret = process.env.N8N_ONBOARDING_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.N8N_ONBOARDING_WEBHOOK_URL = "https://n8n.example.com/webhook/person-onboarding";
    process.env.N8N_ONBOARDING_WEBHOOK_SECRET = "top-secret";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.N8N_ONBOARDING_WEBHOOK_URL = originalUrl;
    process.env.N8N_ONBOARDING_WEBHOOK_SECRET = originalSecret;
  });

  it("builds onboarding email content with organization name", () => {
    const email = buildOnboardingEmail({
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      organizationName: "ABC Company",
      organizationCode: "ABCCO",
    });

    expect(email.subject).toBe("Your Activity Log credentials");
    expect(email.textBody).toContain("Hello Juan,");
    expect(email.textBody).toContain("Organization Code:");
    expect(email.textBody).toContain("ABCCO");
    expect(email.textBody).toContain("202600001");
    expect(email.textBody).toContain("G7kP2mQ9xL4A");
    expect(email.textBody.toLowerCase()).not.toContain("employee");
  });

  it("returns sent when n8n accepts the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const email = buildOnboardingEmail({
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      organizationName: "Example Company",
      organizationCode: "EXAMPLE",
    });
    const result = await attemptAutomatedOnboardingEmail({
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      organizationName: "Example Company",
      organizationCode: "EXAMPLE",
      ...email,
    });

    expect(result).toEqual({ status: "sent" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/person-onboarding",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Attendance-Webhook-Secret": "top-secret",
        }),
      }),
    );

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      event: "person.created",
      to: "juan@example.com",
      subject: "Your Activity Log credentials",
      textBody: expect.stringContaining("Hello Juan,"),
      firstName: "Juan",
      lastName: "Dela Cruz",
      fullName: "Juan Dela Cruz",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      organizationName: "Example Company",
      organizationCode: "EXAMPLE",
    });
  });

  it("returns not configured when env vars are missing", async () => {
    delete process.env.N8N_ONBOARDING_WEBHOOK_URL;
    delete process.env.N8N_ONBOARDING_WEBHOOK_SECRET;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const email = buildOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
    });
    const result = await attemptAutomatedOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      ...email,
    });

    expect(result).toEqual({
      status: "not_configured",
      reason: "Automated onboarding email is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unavailable when n8n responds with 500", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 500 })) as typeof fetch;

    const email = buildOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
    });
    const result = await attemptAutomatedOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      ...email,
    });

    expect(result).toEqual({
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    });
  });

  it("returns timeout when fetch aborts", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Timed out"), { name: "AbortError" })) as typeof fetch;

    const email = buildOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
    });
    const result = await attemptAutomatedOnboardingEmail({
      firstName: "Juan",
      email: "juan@example.com",
      username: "202600001",
      temporaryPassword: "G7kP2mQ9xL4A",
      ...email,
    });

    expect(result).toEqual({
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    });
  });
});
