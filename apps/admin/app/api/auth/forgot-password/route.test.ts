import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
const getPublicSupabaseEnv = vi.fn();
const getOptionalAppBaseUrl = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("../../../../lib/env", () => ({
  getPublicSupabaseEnv,
  getOptionalAppBaseUrl,
}));

describe("POST /api/auth/forgot-password", () => {
  const resetPasswordForEmail = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createClient.mockReturnValue({
      auth: {
        resetPasswordForEmail,
      },
    });
    getPublicSupabaseEnv.mockReturnValue({
      url: "https://supabase.example",
      anonKey: "anon-key",
    });
    getOptionalAppBaseUrl.mockReturnValue("https://attendancelogger.vercel.app");
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  async function post(payload: Record<string, unknown>) {
    const { POST } = await import("./route");
    return POST(
      new Request("https://attendancelogger.vercel.app/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  it("returns a generic success response", async () => {
    const response = await post({
      email: "owner@example.com",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "If an account exists for that email, we've sent password reset instructions.",
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("owner@example.com", {
      redirectTo: "https://attendancelogger.vercel.app/reset-password",
    });
  });

  it("rejects invalid email input", async () => {
    const response = await post({
      email: "not-an-email",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Enter a valid email address.");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
