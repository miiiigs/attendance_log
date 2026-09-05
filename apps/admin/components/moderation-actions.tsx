"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ButtonSpinner } from "./button-spinner";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(result?.error ?? "Moderation action failed.");
  }
}

export function ReportModerationActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"hide" | "dismiss" | null>(null);
  const [isRoutePending, startTransition] = useTransition();
  const busy = Boolean(pendingAction) || isRoutePending;

  async function act(action: "hide" | "dismiss") {
    setPendingAction(action);
    setError(null);
    try {
      await postJson(`/api/platform/activity-reports/${reportId}/${action}`, {});
      startTransition(() => router.refresh());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Moderation action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs font-medium text-[var(--danger)]">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => act("hide").catch(() => undefined)}
          disabled={busy}
          className="admin-button-danger disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "hide" ? <ButtonSpinner /> : null}
          Hide Activity
        </button>
        <button
          type="button"
          onClick={() => act("dismiss").catch(() => undefined)}
          disabled={busy}
          className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "dismiss" ? <ButtonSpinner /> : null}
          Dismiss Report
        </button>
      </div>
    </div>
  );
}

export function RestoreActivityAction({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRoutePending, startTransition] = useTransition();
  const busy = loading || isRoutePending;

  async function restore() {
    setLoading(true);
    setError(null);
    try {
      await postJson(`/api/platform/activities/${activityId}/restore`, {});
      startTransition(() => router.refresh());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore activity.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs font-medium text-[var(--danger)]">{error}</p> : null}
      <button
        type="button"
        onClick={() => restore().catch(() => undefined)}
        disabled={busy}
        className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? <ButtonSpinner /> : null}
        Restore Activity
      </button>
    </div>
  );
}
