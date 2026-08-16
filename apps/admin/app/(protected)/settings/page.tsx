import { SettingsForm } from "../../../components/settings-form";
import { getSettings } from "../../../lib/data/admin";

export default async function SettingsPage() {
  const settings = await getSettings();

  if (!settings) {
    return (
      <section className="admin-card p-6">
        <p className="text-sm text-[var(--muted)]">No settings row found. Seed the database first.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="admin-eyebrow">Settings</p>
        <h1 className="admin-page-title mt-3">Organization defaults</h1>
        <p className="admin-page-subtitle mt-2">Control the attendance rules and organization-wide preferences used across the system.</p>
      </div>
      <SettingsForm settings={settings} />
    </section>
  );
}
