export interface OrganizationIdentity {
  code: string;
  slug: string;
  name: string;
}

export interface OrganizationBranding {
  logoKey: string | null;
  organizationName: string;
}

const ORGANIZATION_LOGO_KEYS: Readonly<Record<string, string>> = {
  scppa: "scppa",
};

export function getOrganizationBranding(organization: OrganizationIdentity): OrganizationBranding {
  const slugKey = organization.slug?.toLowerCase();
  const codeKey = organization.code?.toLowerCase();
  const logoKey =
    (slugKey ? ORGANIZATION_LOGO_KEYS[slugKey] : undefined) ??
    (codeKey ? ORGANIZATION_LOGO_KEYS[codeKey] : undefined) ??
    null;

  return {
    logoKey,
    organizationName: organization.name,
  };
}
