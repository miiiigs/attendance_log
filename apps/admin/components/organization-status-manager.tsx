"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrganizationStatusManager({
  organizationId,
  currentStatus,
}: {
  organizationId: string;
  currentStatus: "active" | "suspended" | "archived";
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"active" | "suspended" | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="admin-button-secondary"
          onClick={() => updateStatus("active")}
          disabled={currentStatus === "active" || pending !== null}
        >
          {pending === "active" ? "Reactivating..." : "Reactivate"}
        </button>
        <button
          type="button"
          className="admin-button-warning"
          onClick={() => updateStatus("suspended")}
          disabled={currentStatus === "suspended" || pending !== null}
        >
          {pending === "suspended" ? "Suspending..." : "Suspend"}
        </button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
