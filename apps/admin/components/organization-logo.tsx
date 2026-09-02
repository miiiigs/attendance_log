import Image from "next/image";
import { Building2 } from "lucide-react";
import { getOrganizationBranding, type OrganizationIdentity } from "@attendance/shared";

const ORGANIZATION_LOGO_PATHS: Readonly<Record<string, string>> = {
  scppa: "/scppa-logo.png",
};

export function OrganizationLogo({
  organization,
  size = 44,
}: {
  organization: OrganizationIdentity;
  size?: number;
}) {
  const { logoKey, organizationName } = getOrganizationBranding(organization);
  const logoPath = logoKey ? ORGANIZATION_LOGO_PATHS[logoKey] : null;

  if (!logoPath) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-2xl bg-[#e8e3d9] text-[#8a8578]"
        style={{ width: size, height: size }}
        aria-label={`${organizationName} logo`}
      >
        <Building2 style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={logoPath}
        alt={`${organizationName} logo`}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
