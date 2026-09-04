/**
 * Authoritative guest/registered derivation from the Supabase Auth identity.
 *
 * Never derive guest identity from `profiles.email`; the profile is display /
 * cache data and can lag the Auth identity (e.g. before bootstrap runs). Auth
 * state (`session.user.is_anonymous` plus the confirmed-email claim) is the
 * source of truth.
 */
export interface AuthIdentityLike {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean | null;
}

export function isAnonymousUser(user: AuthIdentityLike | null | undefined): boolean {
  return user?.is_anonymous === true;
}

export function hasVerifiedAuthEmail(user: AuthIdentityLike | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at);
}

/**
 * A user is a guest only while Supabase reports them as anonymous AND their
 * email is not yet confirmed. A converted anonymous user (confirmed email) is
 * treated as registered even if the provider still flags `is_anonymous` on a
 * transitional session.
 */
export function isGuestUser(user: AuthIdentityLike | null | undefined): boolean {
  return isAnonymousUser(user) && !hasVerifiedAuthEmail(user);
}

export function isRegisteredUser(user: AuthIdentityLike | null | undefined): boolean {
  return Boolean(user) && !isGuestUser(user);
}
