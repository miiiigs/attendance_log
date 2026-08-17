import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiContext = vi.fn();
const getOrganizationName = vi.fn();
const getPersonByIdForCredentials = vi.fn();
const generateTemporaryPassword = vi.fn();
const buildOnboardingEmail = vi.fn();
const attemptAutomatedOnboardingEmail = vi.fn();
const createSupabaseServiceClient = vi.fn();

vi.mock("../../../../../../lib/auth", () => ({
  requireAdminApiContext,
}));

vi.mock("../../../../../../lib/people", () => ({
  getOrganizationName,
  getPersonByIdForCredentials,
}));

vi.mock("../../../../../../lib/passwords", () => ({
  generateTemporaryPassword,
}));

vi.mock("../../../../../../lib/server/onboarding-email", () => ({
  buildOnboardingEmail,
  attemptAutomatedOnboardingEmail,
}));

vi.mock("../../../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

describe("POST /api/admin/people/[id]/credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminApiContext.mockResolvedValue({ session: { user: { id: "admin-1" } }, profile: { id: "admin-1" } });
    getOrganizationName.mockResolvedValue("Example Company");
    getPersonByIdForCredentials.mockResolvedValue({
      id: "person-1",
      username: "202600021",
      first_name: "Juan",
      last_name: "Dela Cruz",
      email: "juan@example.com",
      role: "person",
      status: "active",
    });
    generateTemporaryPassword.mockReturnValue("K9pQ2xM7aR4N");
    buildOnboardingEmail.mockReturnValue({
      recipient: "juan@example.com",
      subject: "Your SCPAA Attendance Account",
      textBody: "Hello Juan,\n\nYour attendance account has been created.",
      htmlBody: "<p>Hello Juan</p>",
      fullEmailText: "To: juan@example.com\nSubject: Your SCPAA Attendance Account\n\nHello Juan",
    });
  });

  it("generates a new password, updates auth, and calls n8n", async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    createSupabaseServiceClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
    });
    attemptAutomatedOnboardingEmail.mockResolvedValue({ status: "sent" });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/people/person-1/credentials", {
        method: "POST",
        body: JSON.stringify({ mode: "regenerate" }),
      }),
      { params: Promise.resolve({ id: "person-1" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith("person-1", { password: "K9pQ2xM7aR4N" });
    expect(attemptAutomatedOnboardingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "202600021",
        temporaryPassword: "K9pQ2xM7aR4N",
        email: "juan@example.com",
        subject: "Your SCPAA Attendance Account",
      }),
    );
    expect(body).toMatchObject({
      ok: true,
      username: "202600021",
      temporaryPassword: "K9pQ2xM7aR4N",
      onboarding: {
        deliveryStatus: "sent",
        recipient: "juan@example.com",
      },
    });
  });

  it("keeps manual fallback available when automation fails after reset", async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    createSupabaseServiceClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
    });
    attemptAutomatedOnboardingEmail.mockResolvedValue({
      status: "unavailable",
      reason: "Automated email delivery is currently unavailable.",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/people/person-1/credentials", {
        method: "POST",
        body: JSON.stringify({ mode: "regenerate" }),
      }),
      { params: Promise.resolve({ id: "person-1" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith("person-1", { password: "K9pQ2xM7aR4N" });
    expect(body).toMatchObject({
      ok: true,
      username: "202600021",
      temporaryPassword: "K9pQ2xM7aR4N",
      onboarding: {
        deliveryStatus: "unavailable",
        recipient: "juan@example.com",
        subject: "Your SCPAA Attendance Account",
      },
    });
  });
});
