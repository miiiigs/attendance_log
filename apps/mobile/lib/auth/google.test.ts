import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_UNAVAILABLE_ERROR } from "./friendly";

const mocks = vi.hoisted(() => ({
  makeRedirectUri: vi.fn(() => "qrlog://auth/callback"),
  openAuthSessionAsync: vi.fn(),
  linkingParse: vi.fn(),
}));

vi.mock("expo-auth-session", () => ({
  makeRedirectUri: mocks.makeRedirectUri,
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: (...args: unknown[]) => mocks.openAuthSessionAsync(...args),
}));

vi.mock("expo-linking", () => ({
  parse: (url: string) => mocks.linkingParse(url),
}));

import { continueWithGoogle, getGoogleRedirectUrl } from "./google";

function fakeSupabase(): any {
  return {
    auth: {
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  };
}

describe("Continue with Google (Supabase PKCE OAuth orchestration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the exact qrlog auth/callback redirect URL", () => {
    expect(getGoogleRedirectUrl()).toBe("qrlog://auth/callback");
    expect(mocks.makeRedirectUri).toHaveBeenCalledWith({ scheme: "qrlog", path: "auth/callback" });
  });

  it("opens Supabase's OAuth URL and exchanges the returned code for a session", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://aluqdhhflqktraxrrrew.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    mocks.openAuthSessionAsync.mockResolvedValue({ type: "success", url: "qrlog://auth/callback?code=abc123" });
    mocks.linkingParse.mockReturnValue({ queryParams: { code: "abc123" } });
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await continueWithGoogle(supabase);

    expect(result).toEqual({ ok: true });
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "qrlog://auth/callback", skipBrowserRedirect: true },
    });
    expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith(
      "https://aluqdhhflqktraxrrrew.supabase.co/auth/v1/authorize?provider=google",
      "qrlog://auth/callback",
    );
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc123");
  });

  it("never calls exchangeCodeForSession when the browser flow is cancelled", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://x.supabase.co/auth/v1/authorize" },
      error: null,
    });
    mocks.openAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    const result = await continueWithGoogle(supabase);

    expect(result).toEqual({ ok: false });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("shows a friendly configuration error when the Google provider is not enabled", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: "Provider is not enabled", code: "provider_disabled" },
    });

    const result = await continueWithGoogle(supabase);

    expect(result).toEqual({ ok: false, error: GOOGLE_UNAVAILABLE_ERROR });
    expect(mocks.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it("does not claim a session when the callback lacks a code", async () => {
    const supabase = fakeSupabase();
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://x.supabase.co/auth/v1/authorize" },
      error: null,
    });
    mocks.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "qrlog://auth/callback?error=access_denied&error_description=User+denied+permission",
    });
    mocks.linkingParse.mockReturnValue({ queryParams: { error: "access_denied" } });

    const result = await continueWithGoogle(supabase);

    expect(result.ok).toBe(false);
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
