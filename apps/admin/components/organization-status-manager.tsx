"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ButtonSpinner } from "./button-spinner";

export function OrganizationStatusManager({
  organizationId,
  currentStatus,
}: {
  organizationId: string;
  currentStatus: "active" | "suspended" | "archived";
}) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const [pending, setPending] = useState<"active" | "suspended" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRoutePending, startTransition] = useTransition();

  async function updateStatus(nextStatus: "active" | "suspended") {
    const confirmed = window.confirm(
      nextStatus === "suspended"
        ? "Suspend this organization? Administrators and members will lose operational access until reactivated."
        : "Reactivate this organization?",
    );

    if (!confirmed) {
      return;
    }

    setPending(nextStatus);
    setError(null);

    const response = await fetch(`/api/platform/organizations/${organizationId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? "Unable to update organization status.");
      setPending(null);
      return;
    }

    setLocalStatus(nextStatus);
    setPending(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="admin-button-secondary"
          onClick={() => updateStatus("active")}
          disabled={localStatus === "active" || pending !== null || isRoutePending}
          aria-busy={pending === "active"}
        >
          {pending === "active" ? (
            <>
              <ButtonSpinner />
              Reactivating...
            </>
          ) : (
            "Reactivate"
          )}
        </button>
        <button
          type="button"
          className="admin-button-warning"
          onClick={() => updateStatus("suspended")}
          disabled={localStatus === "suspended" || pending !== null || isRoutePending}
          aria-busy={pending === "suspended"}
        >
          {pending === "suspended" ? (
            <>
              <ButtonSpinner />
              Suspending...
            </>
          ) : (
            "Suspend"
          )}
        </button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
