"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, QrCode, ShieldOff, Square } from "lucide-react";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { ActivityPeopleTable } from "./activity-people-table";
import { QrDisplay } from "./qr-display";
import { ButtonSpinner } from "./button-spinner";
import { RealtimeRouteRefresh } from "./realtime-route-refresh";
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
  organizationId,
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
  organizationId: string;
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
  const [pendingAction, setPendingAction] = useState<"generate_qr" | "remove_qr" | "end_activity" | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [isRoutePending, startTransition] = useTransition();

  const realtimeChanges = useMemo(
    () => [
      { event: "*", schema: "public", table: "activities", filter: `id=eq.${activityId}` },
      { event: "*", schema: "public", table: "activity_logs", filter: `activity_id=eq.${activityId}` },
      { event: "*", schema: "public", table: "qr_sessions", filter: `activity_id=eq.${activityId}` },
      { event: "*", schema: "public", table: "organization_memberships", filter: `organization_id=eq.${organizationId}` },
    ] as const,
    [activityId, organizationId],
  );

  const isBusy = pendingAction !== null || isRoutePending;
  const isGenerating = pendingAction === "generate_qr";
  const isRemoving = pendingAction === "remove_qr";
  const isEnding = pendingAction === "end_activity";

  async function generateQr() {
    setPendingAction("generate_qr");
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to generate a QR.");
        setPendingAction(null);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Unable to generate a QR.");
      setPendingAction(null);
    }
  }

  async function removeQr() {
    setPendingAction("remove_qr");
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/qr`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to remove the QR.");
        setPendingAction(null);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Unable to remove the QR.");
      setPendingAction(null);
    }
  }

  async function endActivity() {
    setPendingAction("end_activity");
    setError(null);

    try {
      const response = await fetch(`/api/org/${slug}/activities/${activityId}/end`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to end the activity.");
        setPendingAction(null);
        return;
      }

      startTransition(() => {
        router.push(`/org/${slug}/activities/${activityId}`);
      });
    } catch {
      setError("Unable to end the activity.");
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <RealtimeRouteRefresh channelName={`current-activity-${organizationId}-${activityId}`} changes={realtimeChanges} />

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
                <button type="button" onClick={generateQr} disabled={isBusy} aria-busy={isGenerating} className="admin-button disabled:cursor-not-allowed disabled:opacity-70">
                  {isGenerating ? <ButtonSpinner /> : <QrCode className="h-4 w-4" />}
                  {isGenerating ? "Generating..." : hasActiveQr ? "Generate Replacement" : "Generate New QR"}
                </button>
              </div>
            )}

            {qr ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={generateQr} disabled={isBusy} aria-busy={isGenerating} className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-70">
                  {isGenerating ? <ButtonSpinner /> : <QrCode className="h-4 w-4" />}
                  {isGenerating ? "Generating..." : "Generate Replacement"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this QR? Members will no longer be able to scan it. The activity stays active.")) {
                      removeQr().catch(() => undefined);
                    }
                  }}
                  disabled={isBusy}
                  aria-busy={isRemoving}
                  className="admin-button-warning disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRemoving ? <ButtonSpinner /> : <ShieldOff className="h-4 w-4" />}
                  {isRemoving ? "Removing..." : "Remove QR"}
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
            Ending the activity stops the QR from accepting new participants and records the activity end time as Time Out for
            everyone who is still timed in.
          </p>

          {confirmEnd ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">End Activity?</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {activityName} will be marked as completed. The current QR will stop accepting new participants, and anyone
                    still timed in will receive the same Time Out timestamp as the activity end time.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} disabled={isEnding} className="admin-button-secondary">
                  Cancel
                </button>
                <button type="button" data-testid="end-activity-confirm" onClick={endActivity} disabled={isBusy} aria-busy={isEnding} className="admin-button-danger disabled:cursor-not-allowed disabled:opacity-70">
                  {isEnding ? (
                    <>
                      <ButtonSpinner />
                      Ending...
                    </>
                  ) : (
                    "End Activity"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" data-testid="end-activity-trigger" onClick={() => setConfirmEnd(true)} disabled={isBusy} className="admin-button-warning mt-4 w-full justify-start disabled:cursor-not-allowed disabled:opacity-70">
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
