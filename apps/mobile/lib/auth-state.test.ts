import { describe, expect, it } from "vitest";
import { hasVerifiedAuthEmail, isAnonymousUser, isGuestUser, isRegisteredUser } from "./auth-state";

describe("guest/registered derivation is authoritative from Auth state, not profile.email", () => {
  it("treats an anonymous user without a confirmed email as a guest", () => {
    const guest = { id: "guest-1", email: null, is_anonymous: true, email_confirmed_at: null };
    expect(isAnonymousUser(guest)).toBe(true);
    expect(isGuestUser(guest)).toBe(true);
    expect(isRegisteredUser(guest)).toBe(false);
  });

  it("treats a user as a guest even if profile-like email data exists (email is NOT the source of truth)", () => {
    const oddButAuthoritative = { id: "guest-2", email: "guest@example.com", is_anonymous: true, email_confirmed_at: null };
    expect(isGuestUser(oddButAuthoritative)).toBe(true);
  });

  it("treats a non-anonymous user as registered even when profile email is absent", () => {
    const registeredWithoutProfileEmail = { id: "user-1", email: null, is_anonymous: false, email_confirmed_at: null };
    expect(isAnonymousUser(registeredWithoutProfileEmail)).toBe(false);
    expect(isGuestUser(registeredWithoutProfileEmail)).toBe(false);
    expect(isRegisteredUser(registeredWithoutProfileEmail)).toBe(true);
  });

  it("treats a confirmed-email user as registered even if is_anonymous lingers on a transitional session", () => {
    const upgradedGuest = { id: "user-2", email: "upgraded@example.com", is_anonymous: true, email_confirmed_at: "2026-09-04T00:00:00.000Z" };
    expect(isGuestUser(upgradedGuest)).toBe(false);
    expect(isRegisteredUser(upgradedGuest)).toBe(true);
    expect(hasVerifiedAuthEmail(upgradedGuest)).toBe(true);
  });

  it("treats null/undefined users as not guests and not registered", () => {
    expect(isGuestUser(null)).toBe(false);
    expect(isRegisteredUser(null)).toBe(false);
    expect(isAnonymousUser(undefined)).toBe(false);
  });
});
