import { describe, expect, it, vi } from "vitest";
import { EMAIL_TAKEN_ERROR, SIGNUP_UNAVAILABLE_ERROR } from "./friendly";
import { createAccount } from "./signup";

function fakeSupabase(): any {
  return {
    auth: {
      signUp: vi.fn(),
      updateUser: vi.fn(),
    },
  };
}

const validInput = {
  displayName: "Alex",
  email: "alex@example.com",
  password: "long-enough-password",
  confirmPassword: "long-enough-password",
};

describe("fresh create-account flow", () => {
  it("uses the Supabase new-account signUp flow, NOT the guest updateUser identity flow", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "i1" }], email_confirmed_at: null }, session: null },
      error: null,
    });

    const result = await createAccount(supabase, validInput);

    expect(result).toEqual({ ok: true, requiresEmailConfirmation: true });
    expect(supabase.auth.signUp).toHaveBeenCalledOnce();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("stores only the non-sensitive display name in Auth user metadata (never authorization data)", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "i1" }] }, session: null },
      error: null,
    });

    await createAccount(supabase, validInput);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "long-enough-password",
      options: {
        data: {
          display_name: "Alex",
          full_name: "Alex",
        },
      },
    });
  });

  it("reports that verification is required when Confirm Email returns no session", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "i1" }], email_confirmed_at: null }, session: null },
      error: null,
    });

    const result = await createAccount(supabase, validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requiresEmailConfirmation).toBe(true);
    }
  });

  it("does not claim a session when Confirm Email is enabled", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "i1" }] }, session: null },
      error: null,
    });

    const result = await createAccount(supabase, validInput);

    expect(result.ok).toBe(true);
  });

  it("treats an existing email (no new identity, no session) as sign-in-instead", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { identities: [], email: "alex@example.com" }, session: null },
      error: null,
    });

    const result = await createAccount(supabase, validInput);

    expect(result).toEqual({ ok: false, error: EMAIL_TAKEN_ERROR });
  });

  it("maps global signup-disabled to a friendly configuration message", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Signups not allowed for this instance", code: "signup_disabled" },
    });

    const result = await createAccount(supabase, validInput);

    expect(result).toEqual({ ok: false, error: SIGNUP_UNAVAILABLE_ERROR });
  });

  it("validates inputs before calling Supabase", async () => {
    const supabase = fakeSupabase();

    const result = await createAccount(supabase, {
      displayName: "",
      email: "not-an-email",
      password: "short",
      confirmPassword: "different",
    });

    expect(result.ok).toBe(false);
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });
});
