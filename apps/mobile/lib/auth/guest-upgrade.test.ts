import { describe, expect, it, vi } from "vitest";
import { EMAIL_TAKEN_ERROR } from "./friendly";
import { checkGuestEmailVerification, finishGuestUpgrade, submitGuestUpgradeEmail } from "./guest-upgrade";

function fakeSupabase(): any {
  return {
    auth: {
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  };
}

describe("guest upgrade keeps the existing identity-update flow", () => {
  it("claims an email via updateUser on the existing anonymous identity (NOT fresh signUp)", async () => {
    const supabase = fakeSupabase();
    supabase.auth.updateUser.mockResolvedValue({ data: { user: { id: "guest-1" } }, error: null });

    const result = await submitGuestUpgradeEmail(supabase, "  Alex@Example.COM ");

    expect(result).toEqual({ ok: true });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: "alex@example.com" });
  });

  it("reports a taken email with a sign-in-instead message", async () => {
    const supabase = fakeSupabase();
    supabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Another user is already linked to this email address", code: "email_exists" },
    });

    const result = await submitGuestUpgradeEmail(supabase, "alex@example.com");

    expect(result).toEqual({ ok: false, error: EMAIL_TAKEN_ERROR });
  });

  it("waits for email confirmation before allowing a password", async () => {
    const supabase = fakeSupabase();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "guest-1", email_confirmed_at: null } },
      error: null,
    });

    const result = await checkGuestEmailVerification(supabase);

    expect(result).toEqual({ ok: true, verified: false });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "guest-1", email_confirmed_at: "2026-09-04T00:00:00.000Z" } },
      error: null,
    });

    const verified = await checkGuestEmailVerification(supabase);
    expect(verified).toEqual({ ok: true, verified: true });
  });

  it("sets the password on the same identity and syncs profiles.email from the verified Auth email", async () => {
    const supabase = fakeSupabase();
    supabase.auth.updateUser.mockResolvedValue({ data: { user: { id: "guest-1" } }, error: null });
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const result = await finishGuestUpgrade(supabase, "new-password-123");

    expect(result).toEqual({ ok: true });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
    expect(supabase.rpc).toHaveBeenCalledWith("sync_profile_email");
  });
});
