"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play, Zap } from "lucide-react";
import { ButtonSpinner } from "./button-spinner";

export function StartActivityForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"community_only" | "anyone_with_code">("community_only");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRoutePending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Activity name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, visibility }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to start the activity.");
        setLoading(false);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Unable to start the activity.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
      <div className="flex items-center gap-2.5">
        <Play className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Start New Activity</h2>
      </div>

      <label className="block">
        <span className="admin-field-label">Activity Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. General Assembly"
          maxLength={200}
          className="admin-input"
        />
      </label>

      <div>
        <span className="admin-field-label">Activity access</span>
        <div className="mt-2 grid gap-2">
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="radio"
              name="visibility"
              value="community_only"
              checked={visibility === "community_only"}
              onChange={() => setVisibility("community_only")}
            />
            <span className="text-sm font-medium text-[var(--foreground)]">Community members only</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="radio"
              name="visibility"
              value="anyone_with_code"
              checked={visibility === "anyone_with_code"}
              onChange={() => setVisibility("anyone_with_code")}
            />
            <span className="text-sm font-medium text-[var(--foreground)]">Anyone with QR/activity code</span>
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      <button type="submit" data-testid="start-activity-submit" disabled={loading || isRoutePending} aria-busy={loading || isRoutePending} className="admin-button w-full disabled:cursor-not-allowed disabled:opacity-70">
        {loading || isRoutePending ? <ButtonSpinner /> : <Zap className="h-4 w-4" />}
        {loading || isRoutePending ? "Starting..." : "Start Activity"}
      </button>

      <p className="text-xs leading-6 text-[var(--muted)]">
        Starting an activity creates it and automatically generates its QR code (valid 5 hours by default). If QR generation fails,
        you can generate one from the current activity page.
      </p>
    </form>
  );
}
