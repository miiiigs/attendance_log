import { requireAdminOrOrgAdmin } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminOrOrgAdmin();

  return <>{children}</>;
}
