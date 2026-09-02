import { describe, expect, it } from "vitest";
import { getOrganizationBranding } from "./branding";

describe("getOrganizationBranding", () => {
  it("resolves the scppa logo by slug", () => {
    const branding = getOrganizationBranding({
      code: "SCPPA",
      slug: "scppa",
      name: "South Cotabato Parole and Probation Administration",
    });

    expect(branding.logoKey).toBe("scppa");
    expect(branding.organizationName).toBe("South Cotabato Parole and Probation Administration");
  });

  it("resolves the scppa logo by uppercase code even when the slug differs", () => {
    const branding = getOrganizationBranding({
      code: "SCPPA",
      slug: "scppa-local",
      name: "South Cotabato Parole and Probation Administration",
    });

    expect(branding.logoKey).toBe("scppa");
  });

  it("returns a null logoKey for an unknown organization", () => {
    const branding = getOrganizationBranding({
      code: "ACME",
      slug: "acme",
      name: "ACME Community Center",
    });

    expect(branding.logoKey).toBeNull();
    expect(branding.organizationName).toBe("ACME Community Center");
  });
});
