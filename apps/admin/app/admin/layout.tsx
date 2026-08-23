import { PlatformShell } from "../../components/platform-shell";
import { requirePlatformAdmin } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requirePlatformAdmin();

  return <PlatformShell profile={profile}>{children}</PlatformShell>;
}
