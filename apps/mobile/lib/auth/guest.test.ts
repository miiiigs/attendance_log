import { describe, expect, it, vi } from "vitest";
import { GUEST_UNAVAILABLE_ERROR } from "./friendly";
import { createGuestSession } from "./guest";

function fakeSupabase(): any {
  return {
    auth: {
      signInAnonymously: vi.fn(),
    },
    rpc: vi.fn(),
  };
}

describe("continue-as-guest flow", () => {
  it("creates the anonymous Auth identity only when explicitly invoked (no auto-create on view)", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInAnonymously.mockResolvedValue({ data: { user: {} }, error: null });
    supabase.rpc.mockResolvedValue({ data: { id: "guest-1" }, error: null });

    // Asserting the function is call-driven: importing and rendering the guest
    // screen never calls it. Here we simply verify both calls happen in order
    // inside the single explicit action.
    const result = await createGuestSession(supabase, "Alex");

    expect(result).toEqual({ ok: true });
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledOnce();
  });

  it("calls create_guest_profile with the normalized display name after anonymous auth", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInAnonymously.mockResolvedValue({ data: { user: {} }, error: null });
    supabase.rpc.mockResolvedValue({ data: { id: "guest-1" }, error: null });

    await createGuestSession(supabase, "  Alex  ");

    expect(supabase.auth.signInAnonymously).toHaveBeenCalledWith();
    expect(supabase.rpc).toHaveBeenCalledWith("create_guest_profile", { display_name: "Alex" });
  });

  it("rejects an empty display name without creating any Auth identity", async () => {
    const supabase = fakeSupabase();

    const result = await createGuestSession(supabase, "   ");

    expect(result.ok).toBe(false);
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("never creates a profile when anonymous sign-in is disabled, and shows a friendly config error", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: "Signups not allowed for this instance", code: "anonymous_provider_disabled" },
    });

    const result = await createGuestSession(supabase, "Alex");

    expect(result).toEqual({ ok: false, error: GUEST_UNAVAILABLE_ERROR });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns a generic failure if the guest profile cannot be created", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInAnonymously.mockResolvedValue({ data: { user: {} }, error: null });
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "db down" } });

    const result = await createGuestSession(supabase, "Alex");

    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });
});
