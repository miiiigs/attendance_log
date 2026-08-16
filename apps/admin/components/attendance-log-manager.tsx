"use client";

import { formatAttendanceTime } from "@attendance/shared";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceRow } from "../lib/data/admin";

type AttendanceAction = "time_out" | "revert_time_out";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "error" in reason &&
    typeof reason.error === "string" &&
    reason.error
  ) {
    return reason.error;
  }

  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string" &&
    reason.message
  ) {
    return reason.message;
  }

  return "Unable to update attendance records.";
}

export function AttendanceLogManager({
  date,
  rows,
  today,
}: {
  date: string;
  rows: AttendanceRow[];
  today: string;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const actionableRows = rows.filter((row) => row.canTimeOut || row.canRevertTimeOut);
  const activeSelectedIds = selectedIds.filter((id) => actionableRows.some((row) => row.id === id));
  const selectedRows = rows.filter((row) => activeSelectedIds.includes(row.id));
  const selectedTimeOutRows = selectedRows.filter((row) => row.canTimeOut);
  const selectedRevertRows = selectedRows.filter((row) => row.canRevertTimeOut);
  const openRows = rows.filter((row) => row.canTimeOut);
  const completedRows = rows.filter((row) => row.canRevertTimeOut);
  const canManage = date === today;
  const busy = isSubmitting || isRefreshing;
  const allEligibleSelected = actionableRows.length > 0 && actionableRows.every((row) => activeSelectedIds.includes(row.id));

  function toggleSelection(id: string) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function toggleSelectAll() {
    if (allEligibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(actionableRows.map((row) => row.id));
  }

  async function submitAction(action: AttendanceAction, mode: "all" | "selected") {
    const targetRows =
      action === "time_out"
        ? mode === "all"
          ? openRows
          : selectedTimeOutRows
        : selectedRevertRows;
    const targetCount = targetRows.length;

    if (!canManage) {
      setError("Manual attendance actions are only available for today's Daily Logs.");
      setSuccess(null);
      return;
    }

    if (targetCount === 0) {
      setError(
        action === "time_out"
          ? mode === "all"
            ? "There are no timed-in users to time out."
            : "Select at least one timed-in person first."
          : "Select at least one completed time-out to revert.",
      );
      setSuccess(null);
      return;
    }

    const confirmationMessage =
      action === "time_out"
        ? mode === "all"
          ? `Time out all ${targetCount} users who are still timed in for ${date}?`
          : `Time out ${targetCount} selected user${targetCount === 1 ? "" : "s"} for ${date}?`
        : `Revert the time out for ${targetCount} selected user${targetCount === 1 ? "" : "s"} on ${date}?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/attendance/time-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          date,
          mode,
          userIds: mode === "selected" || action === "revert_time_out" ? targetRows.map((row) => row.id) : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        updatedCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update attendance records.");
      }

      setSelectedIds([]);
      setSuccess(
        payload.message ??
          (payload.updatedCount
            ? action === "time_out"
              ? `Timed out ${payload.updatedCount} user${payload.updatedCount === 1 ? "" : "s"}.`
              : `Reverted ${payload.updatedCount} time-out${payload.updatedCount === 1 ? "" : "s"}.`
            : "No matching timed-in users were found."),
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (reason) {
      setError(getErrorMessage(reason));
      setSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="admin-card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div>
              <p className="admin-eyebrow">Manual time-out</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Manage open and completed logs</h2>
            </div>
            <p className="admin-inline-note max-w-2xl">
              Time out users who forgot to log out, or revert a mistaken time-out before the user scans again.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="admin-chip admin-chip-soft">{openRows.length} open logs</span>
            <span className="admin-chip admin-chip-success">{completedRows.length} completed</span>
            <span className="admin-chip admin-chip-warning">{activeSelectedIds.length} selected</span>
          </div>
        </div>

        {!canManage ? (
          <div className="admin-card-muted p-4 text-sm text-[var(--muted)]">
            Manual attendance actions are enabled only for today&apos;s Daily Logs. Switch the date back to {today} to use these actions.
          </div>
        ) : null}

        {success ? (
          <div className="admin-card-muted border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent)]">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="admin-card-muted border border-[#fecaca] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="admin-inline-note">
            {openRows.length || completedRows.length
              ? "Selected open logs can be timed out, and selected completed logs can be reverted if clicked by mistake."
              : "There are no actionable logs for this date."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="admin-button-secondary"
              disabled={!canManage || !selectedRevertRows.length || busy}
              onClick={() => submitAction("revert_time_out", "selected")}
            >
              {busy ? "Updating..." : "Revert selected time-out"}
            </button>
            <button
              type="button"
              className="admin-button-secondary"
              disabled={!canManage || !selectedTimeOutRows.length || busy}
              onClick={() => submitAction("time_out", "selected")}
            >
              {busy ? "Updating..." : "Time out selected"}
            </button>
            <button
              type="button"
              className="admin-button-danger"
              disabled={!canManage || !openRows.length || busy}
              onClick={() => submitAction("time_out", "all")}
            >
              {busy ? "Updating..." : "Time out everyone"}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-shell">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-14">
                    <input
                      aria-label="Select all actionable users"
                      className="admin-checkbox"
                      disabled={!canManage || !actionableRows.length || busy}
                      checked={allEligibleSelected}
                      onChange={toggleSelectAll}
                      type="checkbox"
                    />
                  </th>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const selected = activeSelectedIds.includes(row.id);

                  return (
                    <tr key={row.id} className={`admin-table-row${selected ? " admin-table-row-selected" : ""}`}>
                      <td>
                        {row.canTimeOut || row.canRevertTimeOut ? (
                          <input
                            aria-label={`Select ${row.name}`}
                            className="admin-checkbox"
                            checked={selected}
                            disabled={!canManage || busy}
                            onChange={() => toggleSelection(row.id)}
                            type="checkbox"
                          />
                        ) : (
                          <span className="text-xs text-[var(--muted)]">-</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                            {getInitials(row.name)}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{row.name}</p>
                            <p className="font-mono text-xs text-[var(--muted)]">{row.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-[var(--muted)]">{row.email}</td>
                      <td className="font-mono text-sm text-[var(--foreground)]">{formatAttendanceTime(row.timeIn)}</td>
                      <td className="font-mono text-sm text-[var(--foreground)]">{formatAttendanceTime(row.timeOut)}</td>
                      <td>
                        <span
                          className={`admin-chip ${
                            row.state === "Completed"
                              ? "admin-chip-success"
                              : row.state === "Timed in"
                                ? "admin-chip-warning"
                                : "admin-chip-soft"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            row.state === "Completed"
                              ? "bg-[var(--accent)]"
                              : row.state === "Timed in"
                                ? "bg-[var(--warning)]"
                                : "bg-[#9da3ad]"
                          }`} />
                          {row.state}
                          {row.late ? " • Late" : ""}
                        </span>
                        {row.canRevertTimeOut ? (
                          <p className="mt-2 text-xs text-[var(--muted)]">Eligible for time-out reversal</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p className="text-sm font-medium text-[var(--foreground)]">No attendance rows match the current filters.</p>
            <p className="text-xs text-[var(--muted)]">Try another date or broaden the search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
