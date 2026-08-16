"use client";

import { settingsSchema } from "@attendance/shared";
import { Building2, Clock3, Info, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({
  settings,
}: {
  settings: {
    id: string;
    organization_name: string;
    timezone: string;
    work_start_time: string;
    work_end_time: string;
    grace_period_minutes: number;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const parsed = settingsSchema.safeParse({
      organizationName: formData.get("organizationName"),
      timezone: formData.get("timezone"),
      workStartTime: formData.get("workStartTime"),
      workEndTime: formData.get("workEndTime"),
      gracePeriodMinutes: Number(formData.get("gracePeriodMinutes")),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid settings input.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: settings.id, ...parsed.data }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to update settings.");
      setLoading(false);
      return;
    }

    setSuccess("Settings updated successfully.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <section className="admin-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#f0ede5] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1eee7] text-[var(--muted)]">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Organization</h2>
            <p className="text-xs text-[var(--muted)]">Basic organization details used across the admin side.</p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="admin-field-label">Organization name</span>
            <input name="organizationName" defaultValue={settings.organization_name} className="admin-input" />
          </label>
          <label className="block">
            <span className="admin-field-label">Timezone</span>
            <input name="timezone" defaultValue={settings.timezone} className="admin-input" />
          </label>
          <div className="admin-card-flat flex items-start gap-2.5 px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
            <p className="text-xs leading-6 text-[var(--muted)]">All dashboard, QR, and attendance timestamps follow this timezone.</p>
          </div>
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#f0ede5] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1eee7] text-[var(--muted)]">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Attendance rules</h2>
            <p className="text-xs text-[var(--muted)]">Define work hours and late thresholds.</p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <label className="block">
            <span className="admin-field-label">Grace period (minutes)</span>
            <input
              name="gracePeriodMinutes"
              type="number"
              min={0}
              max={120}
              defaultValue={settings.grace_period_minutes}
              className="admin-input"
            />
          </label>
          <div className="admin-card-flat flex items-start gap-2.5 px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
            <p className="text-xs leading-6 text-[var(--muted)]">A time in logged after work start plus grace period is marked late.</p>
          </div>
          <label className="block">
            <span className="admin-field-label">Work start time</span>
            <input name="workStartTime" type="time" defaultValue={settings.work_start_time} className="admin-input" />
          </label>
          <label className="block">
            <span className="admin-field-label">Work end time</span>
            <input name="workEndTime" type="time" defaultValue={settings.work_end_time} className="admin-input" />
          </label>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{success}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
          <Save className="h-4 w-4" />
          {loading ? "Saving..." : "Save settings"}
        </button>
        <p className="text-xs text-[var(--muted)]">Changes take effect immediately after a successful save.</p>
      </div>
    </form>
  );
}
