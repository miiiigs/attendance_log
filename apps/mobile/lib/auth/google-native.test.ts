import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_UNAVAILABLE_ERROR } from "./friendly";

const mocks = vi.hoisted(() => ({
  configure: vi.fn(),
  hasPlayServices: vi.fn(),
  signIn: vi.fn(),
  platformOS: "android" as string,
  browserContinue: vi.fn(),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
  },
}));

vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mocks.configure,
    hasPlayServices: mocks.hasPlayServices,
    signIn: mocks.signIn,
  },
  isSuccessResponse: (response: unknown) => {
    const value = response as { type?: string };
    return value?.type === "success";
  },
  isErrorWithCode: (error: unknown) => typeof error === "object" && error !== null && "code" in error,
  statusCodes: mocks.statusCodes,
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mocks.platformOS;
    },
  },
}));

vi.mock("./google", () => ({
  continueWithGoogle: (...args: unknown[]) => mocks.browserContinue(...args),
}));

import { continueWithGoogleNative, signInWithGoogle } from "./google-native";

function fakeSupabase(signInWithIdTokenResult: { error?: unknown } = {}) {
  return {
    auth: {
      signInWithIdToken: vi.fn().mockResolvedValue(signInWithIdTokenResult),
    },
  } as unknown as Parameters<typeof continueWithGoogleNative>[0];
}

describe("native Google sign-in orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.platformOS = "android";
    mocks.hasPlayServices.mockResolvedValue(true);
    mocks.browserContinue.mockResolvedValue({ ok: true });
  });

  it("returns a configuration error when the Web Client ID is not set", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "");
    const result = await continueWithGoogleNative(fakeSupabase());
    expect(result).toEqual({ ok: false, error: GOOGLE_UNAVAILABLE_ERROR });
    expect(mocks.configure).not.toHaveBeenCalled();
  });

  it("configures the native SDK and signs in with the returned ID token", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockResolvedValue({ type: "success", data: { idToken: "id-token-123" } });
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: true });
    expect(mocks.configure).toHaveBeenCalledWith({ webClientId: "web-client-id" });
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: "google", token: "id-token-123" });
  });

  it("does not claim a session when the user cancels", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockResolvedValue({ type: "cancelled", data: null });
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("returns a friendly error when no ID token is returned", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockResolvedValue({ type: "success", data: { idToken: null } });
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false, error: "Google sign-in did not return an ID token. Please try again." });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("returns a Play Services error when Play Services is missing", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.hasPlayServices.mockRejectedValue(new Error("no play services"));
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false, error: "Google Play Services is unavailable or outdated. Please update it and try again." });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("returns a Play Services error when signIn reports PLAY_SERVICES_NOT_AVAILABLE", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockRejectedValue({ code: mocks.statusCodes.PLAY_SERVICES_NOT_AVAILABLE });
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false, error: "Google Play Services is unavailable or outdated. Please update it and try again." });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("returns a neutral cancel when a sign-in is already in progress", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockRejectedValue({ code: mocks.statusCodes.IN_PROGRESS });
    const supabase = fakeSupabase();

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("maps a Supabase sign-in failure to a friendly error", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "web-client-id");
    mocks.signIn.mockResolvedValue({ type: "success", data: { idToken: "id-token-123" } });
    const supabase = fakeSupabase({ error: { message: "Provider is not enabled", code: "provider_disabled" } });

    const result = await continueWithGoogleNative(supabase);

    expect(result).toEqual({ ok: false, error: GOOGLE_UNAVAILABLE_ERROR });
  });

  it("retains the browser OAuth fallback on non-Android platforms", async () => {
    mocks.platformOS = "ios";
    const supabase = fakeSupabase();

    const result = await signInWithGoogle(supabase);

    expect(result).toEqual({ ok: true });
    expect(mocks.browserContinue).toHaveBeenCalledWith(supabase);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("retains the browser OAuth fallback on Android when native is not configured", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID", "");
    mocks.platformOS = "android";
    const supabase = fakeSupabase();

    const result = await signInWithGoogle(supabase);

    expect(result).toEqual({ ok: true });
    expect(mocks.browserContinue).toHaveBeenCalledWith(supabase);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
