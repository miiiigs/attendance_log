import { AdminShell } from "../../components/admin-shell";
import { requireAdminOrOrgAdmin } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdminOrOrgAdmin();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
