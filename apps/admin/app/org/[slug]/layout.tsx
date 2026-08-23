import { OrgShell } from "../../../components/org-shell";
import { requireOrgAdmin } from "../../../lib/org-auth";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { profile, organization } = await requireOrgAdmin(slug);

  return (
    <OrgShell
      profile={profile}
      organization={{ name: organization.name, code: organization.code, slug: organization.slug }}
    >
      {children}
    </OrgShell>
  );
}
