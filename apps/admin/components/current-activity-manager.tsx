"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, QrCode, ShieldOff, Square } from "lucide-react";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { ActivityPeopleTable } from "./activity-people-table";
import { QrDisplay } from "./qr-display";
import type { ActivityPersonRow } from "../lib/data/org";

interface QrSession {
  id: string;
  token: string;
  valid_from: string;
  expires_at: string;
  status: string;
}

export function CurrentActivityManager({
  slug,
  activityId,
  activityName,
  startedAt,
  qr,
  hasActiveQr = false,
  people,
  timezone,
  organizationName,
  organizationCode,
}: {
  slug: string;
  activityId: string;
  activityName: string;
  startedAt: string;
  qr: QrSession | null;
  hasActiveQr?: boolean;
  people: ActivityPersonRow[];
  timezone: string;
  organizationName: string;
  organizationCode: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  async function generateQr() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to generate a QR.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to generate a QR.");
    } finally {
      setLoading(false);
    }
  }

  async function removeQr() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/qr`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to remove the QR.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to remove the QR.");
    } finally {
      setLoading(false);
    }
  }

  async function endActivity() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/end`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to end the activity.");
        setConfirmEnd(false);
        return;
      }

      setConfirmEnd(false);
      router.push(`/org/${slug}/activities/${activityId}`);
      router.refresh();
    } catch {
      setError("Unable to end the activity.");
      setConfirmEnd(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)]">
        <article className="admin-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="admin-eyebrow">Current Activity</p>
              <h1 className="admin-page-title mt-3">{activityName}</h1>
              <p className="admin-page-subtitle mt-2">Started {formatDateTimeInTimeZone(startedAt, timezone)}</p>
            </div>
            <span className="admin-chip admin-chip-success">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              In progress
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
            <div className="flex items-center gap-2.5">
              <QrCode className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Activity QR</h2>
            </div>

            {qr ? (
              <QrDisplay
                token={qr.token}
                organizationName={organizationName}
                organizationCode={organizationCode}
                activityName={activityName}
                timezone={timezone}
                validFrom={qr.valid_from}
                expiresAt={qr.expires_at}
              />
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-4 text-sm text-[var(--foreground)]">
                  <p className="font-semibold text-[var(--warning)]">
                    {hasActiveQr ? "QR active but not displayable here" : "No active QR"}
                  </p>
                  <p className="mt-1">
                    {hasActiveQr
                      ? "A QR is active for this activity but its display token is not available on this device. Generate a replacement to display it here."
                      : "Generate a QR to let members start logging. Removing a QR does not end the activity."}
                  </p>
                </div>
                <button type="button" onClick={generateQr} disabled={loading} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
                  <QrCode className="h-4 w-4" />
                  {loading ? "Generating..." : hasActiveQr ? "Generate Replacement" : "Generate New QR"}
                </button>
              </div>
            )}

            {qr ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={generateQr} disabled={loading} className="admin-button-secondary">
                  <QrCode className="h-4 w-4" />
                  Generate Replacement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this QR? Members will no longer be able to scan it. The activity stays active.")) {
                      removeQr().catch(() => undefined);
                    }
                  }}
                  disabled={loading}
                  className="admin-button-warning disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldOff className="h-4 w-4" />
                  Remove QR
                </button>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p>
            ) : null}
          </div>
        </article>

        <article className="admin-card p-6">
          <div className="flex items-center gap-2.5">
            <Square className="h-4 w-4 text-[var(--warning)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">End activity</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Ending marks the activity as completed, stops the current QR from accepting new logs, and preserves all existing
            participation history. Historical time-outs are never fabricated.
          </p>

          {confirmEnd ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">End Activity?</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {activityName} will be marked as completed. The current QR will stop accepting new logs. Existing participation
                    history will be preserved.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} disabled={loading} className="admin-button-secondary">
                  Cancel
                </button>
                <button type="button" data-testid="end-activity-confirm" onClick={endActivity} disabled={loading} className="admin-button-danger disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? "Ending..." : "End Activity"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" data-testid="end-activity-trigger" onClick={() => setConfirmEnd(true)} className="admin-button-warning mt-4 w-full justify-start">
              <Square className="h-4 w-4" />
              End Activity
            </button>
          )}
        </article>
      </section>

      <section className="admin-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <CalendarClock className="h-4 w-4 text-[var(--muted)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Member activity log</h2>
        </div>
        <ActivityPeopleTable people={people} timezone={timezone} />
      </section>
    </div>
  );
}
