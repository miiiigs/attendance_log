import { describe, expect, it } from "vitest";
import { deriveAuthState, resolveRouteRedirect } from "./navigation";

describe("navigation auth state", () => {
  it("derives three states from session and guest flags", () => {
    expect(deriveAuthState(false, false)).toBe("unauthenticated");
    expect(deriveAuthState(true, true)).toBe("guest");
    expect(deriveAuthState(true, false)).toBe("registered");
  });
});

describe("route redirect decisions", () => {
  it("redirects an unauthenticated user from an app route to onboarding", () => {
    expect(resolveRouteRedirect("unauthenticated", false)).toBe("/onboarding");
  });

  it("keeps a guest on an app route (Home)", () => {
    expect(resolveRouteRedirect("guest", false)).toBeNull();
  });

  it("keeps a registered user on an app route", () => {
    expect(resolveRouteRedirect("registered", false)).toBeNull();
  });

  it("keeps an unauthenticated user on an auth route", () => {
    expect(resolveRouteRedirect("unauthenticated", true)).toBeNull();
  });

  it("keeps a guest on /register (does not redirect Home)", () => {
    expect(resolveRouteRedirect("guest", true)).toBeNull();
  });

  it("redirects a registered user away from /register to Home", () => {
    expect(resolveRouteRedirect("registered", true)).toBe("/");
  });
});
