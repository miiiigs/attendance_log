import { describe, expect, it, vi } from "vitest";
import {
  friendlyDisplayNameError,
  updateCommunityDisplayName,
  updateGlobalDisplayName,
  validateDisplayName,
} from "./display-name";

function fakeSupabase(rpcResult: { error?: unknown } = {}) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as Parameters<typeof updateGlobalDisplayName>[0];
}

describe("display name validation", () => {
  it("accepts and trims a non-empty name", () => {
    expect(validateDisplayName("  Alex  ")).toEqual({ ok: true, value: "Alex" });
  });

  it("rejects a blank name", () => {
    expect(validateDisplayName("   ").ok).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    expect(validateDisplayName("a".repeat(81)).ok).toBe(false);
  });
});

describe("updateGlobalDisplayName", () => {
  it("validates before calling the RPC", async () => {
    const supabase = fakeSupabase();
    const result = await updateGlobalDisplayName(supabase, "   ");
    expect(result.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with the trimmed name", async () => {
    const supabase = fakeSupabase();
    const result = await updateGlobalDisplayName(supabase, "  Alex  ");
    expect(result).toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("update_profile_display_name", { new_display_name: "Alex" });
  });

  it("maps an inactive-account RPC error", async () => {
    const supabase = fakeSupabase({ error: { message: "Your account is inactive." } });
    const result = await updateGlobalDisplayName(supabase, "Alex");
    expect(result).toEqual({ ok: false, error: "Your account is inactive, so your display name cannot be changed." });
  });

  it("surfaces a display-name validation error from the server", async () => {
    const supabase = fakeSupabase({ error: { message: "Display name must be 80 characters or fewer." } });
    const result = await updateGlobalDisplayName(supabase, "Alex");
    expect(result).toEqual({ ok: false, error: "Display name must be 80 characters or fewer." });
  });
});

describe("updateCommunityDisplayName", () => {
  it("validates before calling the RPC", async () => {
    const supabase = fakeSupabase();
    const result = await updateCommunityDisplayName(supabase, "org-1", "   ");
    expect(result.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with the organization id and trimmed name", async () => {
    const supabase = fakeSupabase();
    const result = await updateCommunityDisplayName(supabase, "org-1", "  Alex  ");
    expect(result).toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("update_own_community_display_name", {
      target_organization_id: "org-1",
      new_display_name: "Alex",
    });
  });

  it("maps a not-an-active-member RPC error", async () => {
    const supabase = fakeSupabase({ error: { message: "You are not an active member of this Community." } });
    const result = await updateCommunityDisplayName(supabase, "org-1", "Alex");
    expect(result).toEqual({ ok: false, error: "You are not an active member of this Community." });
  });
});

describe("friendlyDisplayNameError", () => {
  it("falls back to a generic message for unknown errors", () => {
    expect(friendlyDisplayNameError({ message: "boom" })).toBe("Unable to update your display name. Please try again.");
  });

  it("surfaces a display-name message", () => {
    expect(friendlyDisplayNameError({ message: "Display name is required." })).toBe("Display name is required.");
  });
});
