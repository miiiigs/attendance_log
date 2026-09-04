import { describe, expect, it } from "vitest";
import { deriveAuthState, resolveRouteRedirect, UNAUTHENTICATED_DEFAULT_ROUTE } from "./navigation";

describe("navigation auth state", () => {
  it("derives three states from session and guest flags", () => {
    expect(deriveAuthState(false, false)).toBe("unauthenticated");
    expect(deriveAuthState(true, true)).toBe("guest");
    expect(deriveAuthState(true, false)).toBe("registered");
  });
});

describe("route redirect decisions", () => {
  it("redirects an unauthenticated user from an app route to Sign In (not guest onboarding)", () => {
    expect(resolveRouteRedirect("unauthenticated", false)).toBe("/sign-in");
  });

  it("defaults the unauthenticated destination to Sign In", () => {
    expect(UNAUTHENTICATED_DEFAULT_ROUTE).toBe("/sign-in");
  });

  it("keeps a guest on an app route (Home)", () => {
    expect(resolveRouteRedirect("guest", false)).toBeNull();
  });

  it("keeps a registered user on an app route", () => {
    expect(resolveRouteRedirect("registered", false)).toBeNull();
  });

  it("keeps an unauthenticated user on an auth route (Sign In / Create account / Guest)", () => {
    expect(resolveRouteRedirect("unauthenticated", true)).toBeNull();
  });

  it("keeps a guest on /register (does not redirect Home)", () => {
    expect(resolveRouteRedirect("guest", true)).toBeNull();
  });

  it("redirects a registered user away from /register to Home", () => {
    expect(resolveRouteRedirect("registered", true)).toBe("/");
  });

  it("never redirects an unauthenticated user to the guest screen automatically", () => {
    expect(UNAUTHENTICATED_DEFAULT_ROUTE).not.toBe("/guest");
    expect(UNAUTHENTICATED_DEFAULT_ROUTE).not.toBe("/onboarding");
  });
});
