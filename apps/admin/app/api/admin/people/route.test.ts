import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiContext = vi.fn();
const getOrganizationName = vi.fn();
const generateTemporaryPassword = vi.fn();
const buildOnboardingEmail = vi.fn();
const attemptAutomatedOnboardingEmail = vi.fn();
const createSupabaseServiceClient = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("../../../../lib/auth", () => ({
  requireAdminApiContext,
}));

vi.mock("../../../../lib/people", () => ({
  getOrganizationName,
}));

vi.mock("../../../../lib/passwords", () => ({
  generateTemporaryPassword,
}));

vi.mock("../../../../lib/server/onboarding-email", () => ({
  buildOnboardingEmail,
  attemptAutomatedOnboardingEmail,
}));

vi.mock("../../../../lib/supabase/service", () => ({
  createSupabaseServiceClient,
}));

vi.mock("../../../../lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("POST /api/admin/people", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminApiContext.mockResolvedValue({ session: { user: { id: "admin-1" } }, profile: { id: "admin-1" } });
    getOrganizationName.mockResolvedValue("Example Company");
    generateTemporaryPassword.mockReturnValue("G7kP2mQ9xL4A");
    createSupabaseServerClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: "202600001", error: null }),
    });
    buildOnboardingEmail.mockReturnValue({
      recipient: "juan@example.com",
      subject: "Your SCPAA Attendance Account",
      textBody: "Hello Juan,\n\nYour attendance account has been created.",
      htmlBody: "<p>Hello Juan</p>",
      fullEmailText: "To: juan@example.com\nSubject: Your SCPAA Attendance Account\n\nHello Juan",
    });
  });

  function createSupabaseMock() {
    return {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: "person-1" } }, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "person-1" }, error: null }),
          }),
        }),
      }),
    };
  }

  it("creates a person and reports successful automated email delivery", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServiceClient.mockReturnValue(supabase);
    attemptAutomatedOnboardingEmail.mockResolvedValue({ status: "sent" });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/people", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Juan",
          lastName: "Dela Cruz",
          email: "juan@example.com",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      person: {
        id: "person-1",
        username: "202600001",
      },
      temporaryPassword: "G7kP2mQ9xL4A",
      onboarding: {
        deliveryStatus: "sent",
        recipient: "juan@example.com",
        subject: "Your SCPAA Attendance Account",
      },
    });
    expect(attemptAutomatedOnboardingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Juan",
        lastName: "Dela Cruz",
        email: "juan@example.com",
        username: "202600001",
        temporaryPassword: "G7kP2mQ9xL4A",
        organizationName: "Example Company",
        subject: "Your SCPAA Attendance Account",
      }),
    );
  });

  it("keeps the created person and returns manual fallback when automation is unavailable", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServiceClient.mockReturnValue(supabase);
    attemptAutomatedOnboardingEmail.mockResolvedValue({
      status: "not_configured",
      reason: "Automated onboarding email is not configured.",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/people", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Juan",
          lastName: "Dela Cruz",
          email: "juan@example.com",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      person: {
        id: "person-1",
        username: "202600001",
      },
      temporaryPassword: "G7kP2mQ9xL4A",
      onboarding: {
        deliveryStatus: "not_configured",
        recipient: "juan@example.com",
        subject: "Your SCPAA Attendance Account",
        body: "Hello Juan,\n\nYour attendance account has been created.",
      },
    });
  });

  it("falls back to the legacy zero-argument username RPC when the schema cache does not expose target_year", async () => {
    const supabase = createSupabaseMock();
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Could not find the function public.generate_next_username(target_year) in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: "202600001", error: null })
      .mockResolvedValueOnce({ data: "11111111-1111-1111-1111-111111111111", error: null });

    createSupabaseServiceClient.mockReturnValue(supabase);
    createSupabaseServerClient.mockResolvedValue({ rpc });
    attemptAutomatedOnboardingEmail.mockResolvedValue({ status: "sent" });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/people", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Juan",
          lastName: "Dela Cruz",
          email: "juan@example.com",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      person: {
        id: "person-1",
        username: "202600001",
      },
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "generate_next_username", expect.objectContaining({ target_year: expect.any(Number) }));
    expect(rpc).toHaveBeenNthCalledWith(2, "generate_next_username");
  });
});
