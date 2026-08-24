import { describe, expect, it, vi } from "vitest";
import { changeMobilePassword, requestPasswordReset } from "./account";

vi.mock("./config", () => ({
  getAdminAppUrl: () => "https://scppa-portal.vercel.app",
}));

describe("mobile account helpers", () => {
  it("returns the generic reset message from the admin API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "If an account exists for that email, we've sent password reset instructions.",
      }),
    }) as unknown as typeof fetch;

    const result = await requestPasswordReset("owner@example.com");

    expect(result).toEqual({
      success: true,
      message: "If an account exists for that email, we've sent password reset instructions.",
    });
  });

  it("requires an authenticated session email for password changes", async () => {
    const result = await changeMobilePassword(
      {
        auth: {
          updateUser: vi.fn(),
        },
      } as never,
      null,
      {
        oldPassword: "current-password",
        newPassword: "next-password-123",
        confirmNewPassword: "next-password-123",
      },
    );

    expect(result).toEqual({
      success: false,
      error: "We couldn't verify your account. Please sign in again.",
    });
  });
});
