import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GOOGLE_UNAVAILABLE_ERROR, GENERIC_ERROR, friendlyGoogleError, logAuthFailure } from "./friendly";
import { continueWithGoogle } from "./google";

export type GoogleResult = { ok: true } | { ok: false; error?: string };

const PLAY_SERVICES_ERROR = "Google Play Services is unavailable or outdated. Please update it and try again.";
const MISSING_TOKEN_ERROR = "Google sign-in did not return an ID token. Please try again.";

/**
 * The Web Client ID is public configuration (never a secret). It is injected at
 * build time via EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID and is only used to
 * request the ID token from Google's native SDK. No client secret and no
 * Supabase service role ever live in the app.
 */
function getWebClientId(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID?.trim();
}

export function isNativeGoogleConfigured(): boolean {
  return Boolean(getWebClientId());
}

/**
 * Native Android "Continue with Google" flow:
 *
 *   GoogleSignin.signIn() -> Google ID token -> supabase.auth.signInWithIdToken
 *
 * This uses the free, open-source @react-native-google-signin/google-signin
 * library (the pattern documented in Supabase's Expo React Native guide). It
 * never places a client secret or service role in the app and does not disable
 * Supabase nonce validation. If the Web Client ID is not configured, the caller
 * should use the browser PKCE OAuth fallback instead.
 */
export async function continueWithGoogleNative(supabase: SupabaseClient): Promise<GoogleResult> {
  const webClientId = getWebClientId();
  if (!webClientId) {
    return { ok: false, error: GOOGLE_UNAVAILABLE_ERROR };
  }

  GoogleSignin.configure({ webClientId });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    return { ok: false, error: PLAY_SERVICES_ERROR };
  }

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (reason) {
    if (isErrorWithCode(reason)) {
      if (reason.code === statusCodes.IN_PROGRESS) {
        return { ok: false };
      }
      if (reason.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { ok: false, error: PLAY_SERVICES_ERROR };
      }
    }
    logAuthFailure("google (native sign-in)", reason as { code?: string; message?: string });
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!isSuccessResponse(response)) {
    // The user dismissed the native account picker / consent UI.
    return { ok: false };
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    return { ok: false, error: MISSING_TOKEN_ERROR };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) {
    logAuthFailure("google (native id token)", error);
    return { ok: false, error: friendlyGoogleError(error) };
  }

  return { ok: true };
}

/**
 * Entry point for the Sign In screen. On Android with a configured Web Client
 * ID this uses the native Google account picker; everywhere else (or when the
 * native flow is not configured) it retains the existing browser PKCE OAuth
 * flow.
 */
export async function signInWithGoogle(supabase: SupabaseClient): Promise<GoogleResult> {
  if (Platform.OS === "android" && isNativeGoogleConfigured()) {
    return continueWithGoogleNative(supabase);
  }

  return continueWithGoogle(supabase);
}
