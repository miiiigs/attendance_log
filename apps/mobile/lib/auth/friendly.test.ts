import { describe, expect, it, vi } from "vitest";
import {
  CONNECTION_ERROR,
  EMAIL_TAKEN_ERROR,
  GENERIC_ERROR,
  GOOGLE_UNAVAILABLE_ERROR,
  GUEST_UNAVAILABLE_ERROR,
  INVALID_CREDENTIALS_ERROR,
  SIGNUP_UNAVAILABLE_ERROR,
  friendlyGoogleError,
  friendlyGuestError,
  friendlySignInError,
  friendlySignUpError,
  logAuthFailure,
} from "./friendly";

function authError(code: string, message: string) {
  return { code, message, status: 400, name: "AuthApiError", __isAuthError: true };
}

describe("friendly auth errors", () => {
  it("maps connection failures to the QRLog connection message for every flow", () => {
    const network = new Error("TypeError: Network request failed");
    expect(friendlyGuestError(network)).toBe(CONNECTION_ERROR);
    expect(friendlySignInError(network)).toBe(CONNECTION_ERROR);
    expect(friendlySignUpError(network)).toBe(CONNECTION_ERROR);
    expect(friendlyGoogleError(network)).toBe(CONNECTION_ERROR);
  });

  it("guest: maps anonymous-signin disabled to the guest-unavailable message", () => {
    expect(friendlyGuestError(authError("anonymous_provider_disabled", "Signups not allowed for this instance"))).toBe(
      GUEST_UNAVAILABLE_ERROR,
    );
    expect(friendlyGuestError(authError("signup_disabled", "Signups not allowed for this instance"))).toBe(GUEST_UNAVAILABLE_ERROR);
  });

  it("guest: does not leak raw provider messages when guest access is disabled", () => {
    const message = friendlyGuestError(authError("anonymous_provider_disabled", "Signups not allowed for this instance"));
    expect(message).not.toContain("Signups not allowed");
    expect(message).toBe(GUEST_UNAVAILABLE_ERROR);
  });

  it("sign up: maps global signup disabled to the signup-unavailable message", () => {
    expect(friendlySignUpError(authError("signup_disabled", "Signups not allowed for this instance"))).toBe(SIGNUP_UNAVAILABLE_ERROR);
  });

  it("sign up: maps an existing account to the sign-in-instead message", () => {
    expect(friendlySignUpError(authError("user_already_exists", "User already registered"))).toBe(EMAIL_TAKEN_ERROR);
  });

  it("sign in: maps invalid credentials to the generic message", () => {
    expect(friendlySignInError(authError("invalid_credentials", "Invalid login credentials"))).toBe(INVALID_CREDENTIALS_ERROR);
  });

  it("google: maps a disabled/unconfigured provider to the not-configured message", () => {
    expect(friendlyGoogleError(authError("provider_disabled", "Provider is not enabled"))).toBe(GOOGLE_UNAVAILABLE_ERROR);
    expect(friendlyGoogleError({ message: "Google provider is not configured" })).toBe(GOOGLE_UNAVAILABLE_ERROR);
  });

  it("returns a stable generic message rather than undefined for unknown empty errors", () => {
    expect(friendlyGuestError(null)).toBe(GENERIC_ERROR);
    expect(friendlyGoogleError(undefined)).toBe(GENERIC_ERROR);
  });

  it("does not print secrets when logging", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logAuthFailure("guest", authError("signup_disabled", "Signups not allowed"));
    expect(warn).not.toHaveBeenCalled(); // __DEV__ is false in the test runtime
    warn.mockRestore();
  });
});
