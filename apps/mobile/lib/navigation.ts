export type AuthState = "unauthenticated" | "guest" | "registered";

/**
 * The default destination for an unauthenticated user. Fresh installs and
 * signed-out users land on Sign In, NOT the guest display-name flow.
 */
export const UNAUTHENTICATED_DEFAULT_ROUTE = "/sign-in";

/**
 * Derive the navigation auth state. Distinguishes three states rather than a
 * simple session presence check, because Supabase anonymous guests DO have an
 * authenticated session.
 */
export function deriveAuthState(hasSession: boolean, isGuest: boolean): AuthState {
  if (!hasSession) {
    return "unauthenticated";
  }

  return isGuest ? "guest" : "registered";
}

/**
 * Return the route to redirect to, or null to stay on the current route.
 *
 * Rules:
 *   - app group: only unauthenticated users are redirected (to Sign In).
 *   - auth group: only registered users are redirected (to Home), so guests
 *     can complete the /register upgrade and unauthenticated users can use
 *     Sign In / Create an account / Continue as Guest.
 */
export function resolveRouteRedirect(state: AuthState, inAuthGroup: boolean): "/sign-in" | "/" | null {
  if (!inAuthGroup) {
    return state === "unauthenticated" ? UNAUTHENTICATED_DEFAULT_ROUTE : null;
  }

  return state === "registered" ? "/" : null;
}
