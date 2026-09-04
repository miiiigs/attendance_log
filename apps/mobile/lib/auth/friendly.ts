import type { AuthError } from "@supabase/supabase-js";

export const CONNECTION_ERROR = "Unable to connect to QRLog. Check your internet connection and try again.";
export const GUEST_UNAVAILABLE_ERROR = "Guest access is currently unavailable. Please sign in or create an account.";
export const SIGNUP_UNAVAILABLE_ERROR = "New account creation is currently unavailable.";
export const GOOGLE_UNAVAILABLE_ERROR = "Google sign-in is not configured yet.";
export const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";
export const EMAIL_TAKEN_ERROR = "This email is already linked to a QRLog account. Sign in to that account instead.";
export const GENERIC_ERROR = "Something went wrong. Please try again.";

type ErrorLike = AuthError | Error | { code?: string; message?: string } | null | undefined;

function isConnectionIssue(reason: ErrorLike): boolean {
  const message = (reason?.message ?? "").toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("failed to fetch")
  );
}

function errorCode(reason: ErrorLike): string {
  if (reason && typeof reason === "object" && "code" in reason && typeof reason.code === "string") {
    return reason.code.toLowerCase();
  }
  return "";
}

function messageIncludes(reason: ErrorLike, ...fragments: string[]): boolean {
  const message = (reason?.message ?? "").toLowerCase();
  const code = errorCode(reason);
  return fragments.some((fragment) => {
    const lower = fragment.toLowerCase();
    return message.includes(lower) || code.includes(lower);
  });
}

/**
 * Friendly error shown on the email/password Sign In screen. Raw provider
 * internals are replaced by known-friendly messages; the underlying error is
 * preserved for logging by the caller.
 */
export function friendlySignInError(reason: ErrorLike): string {
  if (isConnectionIssue(reason)) {
    return CONNECTION_ERROR;
  }
  if (messageIncludes(reason, "invalid login credentials", "invalid_credentials")) {
    return INVALID_CREDENTIALS_ERROR;
  }
  if (reason?.message) {
    return reason.message;
  }
  return INVALID_CREDENTIALS_ERROR;
}

/**
 * Friendly error for the "Continue as Guest" flow. Anonymous sign-ins can be
 * disabled independently of email signups; surface that as a configuration
 * problem, never as a raw provider message.
 */
export function friendlyGuestError(reason: ErrorLike): string {
  if (isConnectionIssue(reason)) {
    return CONNECTION_ERROR;
  }
  if (messageIncludes(reason, "signup", "anonymous", "not allowed", "disabled")) {
    return GUEST_UNAVAILABLE_ERROR;
  }
  return GENERIC_ERROR;
}

/**
 * Friendly error for the fresh "Create an account" flow.
 */
export function friendlySignUpError(reason: ErrorLike): string {
  if (isConnectionIssue(reason)) {
    return CONNECTION_ERROR;
  }
  if (messageIncludes(reason, "signups not allowed", "signup_disabled", "signup disabled")) {
    return SIGNUP_UNAVAILABLE_ERROR;
  }
  if (messageIncludes(reason, "already registered", "user_already_exists", "already been registered", "exists")) {
    return EMAIL_TAKEN_ERROR;
  }
  if (reason?.message) {
    return reason.message;
  }
  return GENERIC_ERROR;
}

/**
 * Friendly error for "Continue with Google". A provider that is not enabled or
 * not configured must read as a configuration problem.
 */
export function friendlyGoogleError(reason: ErrorLike): string {
  if (isConnectionIssue(reason)) {
    return CONNECTION_ERROR;
  }
  if (
    messageIncludes(
      reason,
      "provider is not enabled",
      "provider_disabled",
      "not configured",
      "error configuring",
      "no provider",
      "unsupported provider",
      "google",
    )
  ) {
    return GOOGLE_UNAVAILABLE_ERROR;
  }
  if (reason?.message) {
    return reason.message;
  }
  return GENERIC_ERROR;
}

/** Log the underlying error (no secrets) while the UI shows a friendly message. */
export function logAuthFailure(context: string, reason: ErrorLike) {
  const code = errorCode(reason) || "unknown-code";
  const message = reason?.message ?? "unknown message";
  const isDev = typeof globalThis !== "undefined" && (globalThis as { __DEV__?: boolean }).__DEV__ === true;
  if (isDev) {
    console.warn(`[auth] ${context} failed (${code}): ${message}`);
  }
}
