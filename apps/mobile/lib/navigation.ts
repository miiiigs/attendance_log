export type AuthState = "unauthenticated" | "guest" | "registered";

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
 *   - app group: only unauthenticated users are redirected (to onboarding).
 *   - auth group: only registered users are redirected (to Home), so guests
 *     can complete onboarding and the /register upgrade flow.
 */
export function resolveRouteRedirect(state: AuthState, inAuthGroup: boolean): "/onboarding" | "/" | null {
  if (!inAuthGroup) {
    return state === "unauthenticated" ? "/onboarding" : null;
  }

  return state === "registered" ? "/" : null;
}
