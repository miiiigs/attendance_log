import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyGoogleError, GENERIC_ERROR, logAuthFailure } from "./friendly";

/**
 * The QRLog deep-link path that Supabase redirects back to after Google auth.
 * In a native/dev build `getGoogleRedirectUrl()` resolves to
 * `qrlog://auth/callback`; register that exact URL in Supabase's
 * Authentication > URL Configuration > Redirect URLs.
 */
export const GOOGLE_REDIRECT_PATH = "auth/callback";

export function getGoogleRedirectUrl(): string {
  return makeRedirectUri({ scheme: "qrlog", path: GOOGLE_REDIRECT_PATH });
}

export type GoogleSignInResult = { ok: true } | { ok: false; error?: string };

interface OpenAuthSessionLike {
  openAuthSessionAsync(url: string, redirectUrl: string): Promise<{ type: string; url?: string; errorCode?: string | null }>;
}

/**
 * "Continue with Google" using the officially supported Supabase PKCE OAuth
 * flow opened in an in-app browser (Expo AuthSession/WebBrowser).
 *
 * - No Google client secret is placed in the app (Client IDs are public
 *   config; Supabase holds the provider secret server-side).
 * - The auth URL is built by `signInWithOAuth`; the returned code is exchanged
 *   with `exchangeCodeForSession`, so a session is only claimed after the code
 *   exchange succeeds.
 */
export async function continueWithGoogle(
  supabase: SupabaseClient,
  deps: { openAuthSession: OpenAuthSessionLike } = { openAuthSession: WebBrowser },
): Promise<GoogleSignInResult> {
  const redirectTo = getGoogleRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    logAuthFailure("google", error ?? { message: "No OAuth URL returned." });
    return { ok: false, error: friendlyGoogleError(error ?? { message: GENERIC_ERROR }) };
  }

  const result = await deps.openAuthSession.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    // User cancelled or dismissed the browser; not a configuration failure.
    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  const parsed = Linking.parse(result.url);
  const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;

  if (!code) {
    const description =
      typeof parsed.queryParams?.error_description === "string"
        ? parsed.queryParams.error_description
        : typeof parsed.queryParams?.error === "string"
          ? parsed.queryParams.error
          : "Google sign-in did not complete.";
    return { ok: false, error: friendlyGoogleError({ message: description }) };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    logAuthFailure("google (code exchange)", exchangeError);
    return { ok: false, error: friendlyGoogleError(exchangeError) };
  }

  return { ok: true };
}
