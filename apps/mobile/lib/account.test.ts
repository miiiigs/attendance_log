import { beforeEach, describe, expect, it, vi } from "vitest";

const verificationClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock("@supabase/supabase-js", async () => {
  const actual = await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js");

  return {
    ...actual,
    createClient: vi.fn(() => verificationClient),
  };
});

vi.mock("./config", () => ({
  getAdminAppUrl: () => "https://qrlogph.vercel.app",
}));

describe("mobile account helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  it("returns the generic reset message from the admin API", async () => {
    const { requestPasswordReset } = await import("./account");

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
    const { changeMobilePassword } = await import("./account");

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

  it("uses local sign out for temporary password verification and keeps the current session usable", async () => {
    const { changeMobilePassword } = await import("./account");

    verificationClient.auth.signInWithPassword.mockResolvedValue({ error: null });
    verificationClient.auth.signOut.mockResolvedValue({ error: null });

    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "member-1",
          },
        },
      },
      error: null,
    });
    const updateUser = vi.fn().mockResolvedValue({ error: null });

    const result = await changeMobilePassword(
      {
        auth: {
          getSession,
          updateUser,
        },
      } as never,
      {
        access_token: "token",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 9999999999,
        user: {
          id: "member-1",
          email: "member@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-08-26T00:00:00.000Z",
        },
      } as never,
      {
        oldPassword: "current-password",
        newPassword: "next-password-123",
        confirmNewPassword: "next-password-123",
      },
    );

    expect(result).toEqual({ success: true });
    expect(verificationClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "current-password",
    });
    expect(verificationClient.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(getSession).toHaveBeenCalledOnce();
    expect(updateUser).toHaveBeenCalledWith({ password: "next-password-123" });
  });

  it("fails safely when the main mobile session no longer matches after verification", async () => {
    const { changeMobilePassword } = await import("./account");

    verificationClient.auth.signInWithPassword.mockResolvedValue({ error: null });
    verificationClient.auth.signOut.mockResolvedValue({ error: null });

    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "different-user",
          },
        },
      },
      error: null,
    });
    const updateUser = vi.fn();

    const result = await changeMobilePassword(
      {
        auth: {
          getSession,
          updateUser,
        },
      } as never,
      {
        access_token: "token",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 9999999999,
        user: {
          id: "member-1",
          email: "member@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-08-26T00:00:00.000Z",
        },
      } as never,
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
    expect(updateUser).not.toHaveBeenCalled();
  });
});
