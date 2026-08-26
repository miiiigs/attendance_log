"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Info, Save } from "lucide-react";
import { ButtonSpinner } from "./button-spinner";

export function OrgSettingsForm({
  slug,
  settings,
}: {
  slug: string;
  settings: {
    name: string;
    code: string;
    timezone: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "").trim();

    if (!name || !timezone) {
      setError("Organization name and timezone are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/org/${slug}/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, timezone }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to update settings.");
      setLoading(false);
      return;
    }

    setSuccess("Organization settings updated successfully.");
    startTransition(() => {
      router.refresh();
    });
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
            <input name="name" defaultValue={settings.name} className="admin-input" />
          </label>
          <label className="block">
            <span className="admin-field-label">Organization code</span>
            <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 font-mono text-sm text-[var(--foreground)]">
              {settings.code}
            </div>
          </label>
          <label className="block">
            <span className="admin-field-label">Timezone</span>
            <input name="timezone" defaultValue={settings.timezone} className="admin-input" />
          </label>
          <div className="admin-card-flat flex items-start gap-2.5 px-4 py-3.5 md:col-span-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
            <p className="text-xs leading-6 text-[var(--muted)]">
              All dashboard, activity, and QR timestamps for this organization follow this timezone. The organization code is fixed
              once approved.
            </p>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{success}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} aria-busy={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
          {loading ? "Saving..." : "Save settings"}
        </button>
        <p className="text-xs text-[var(--muted)]">Changes take effect immediately after a successful save.</p>
      </div>
    </form>
  );
}
