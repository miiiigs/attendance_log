import { OrgSettingsForm } from "../../../../components/org-settings-form";
import { getOrgSettings } from "../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../lib/org-auth";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);
  const settings = await getOrgSettings(organization.id);

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="admin-eyebrow">{organization.code}</p>
        <h1 className="admin-page-title mt-3">Settings</h1>
        <p className="admin-page-subtitle mt-2">Community-level settings for {organization.name}.</p>
      </div>

      {settings ? (
        <OrgSettingsForm slug={slug} settings={settings} />
      ) : (
        <div className="admin-card p-6">
          <p className="text-sm text-[var(--muted)]">Organization settings could not be loaded.</p>
        </div>
      )}
    </section>
  );
}
