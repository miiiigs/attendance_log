"use client";

import { formatAttendanceTime } from "@attendance/shared";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ, Clock3, RotateCcw, X } from "lucide-react";
import type { AttendanceRow, AttendanceSortBy, AttendanceSortOrder } from "../lib/data/admin";

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
  query,
  sortBy,
  sortOrder,
  rows,
  today,
}: {
  date: string;
  query: string;
  sortBy: AttendanceSortBy;
  sortOrder: AttendanceSortOrder;
  rows: AttendanceRow[];
  today: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateValue, setDateValue] = useState(date);
  const [queryValue, setQueryValue] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const actionableRows = rows.filter((row) => row.canTimeOut || row.canRevertTimeOut);
  const activeSelectedIds = selectedIds.filter((id) => actionableRows.some((row) => row.id === id));
  const selectedRows = rows.filter((row) => activeSelectedIds.includes(row.id));
  const selectedTimeOutRows = selectedRows.filter((row) => row.canTimeOut);
  const selectedRevertRows = selectedRows.filter((row) => row.canRevertTimeOut);
  const canManage = date === today;
  const busy = isSubmitting || isRefreshing;
  const allEligibleSelected = actionableRows.length > 0 && actionableRows.every((row) => activeSelectedIds.includes(row.id));
  const showFloatingActions = canManage && activeSelectedIds.length > 0;
  const hasRevertAction = selectedRevertRows.length > 0;
  const hasTimeOutAction = selectedTimeOutRows.length > 0;

  useEffect(() => {
    setDateValue(date);
  }, [date]);

  useEffect(() => {
    setQueryValue(query);
  }, [query]);

  function replaceFilters(nextFilters: {
    date?: string;
    query?: string;
    sortBy?: AttendanceSortBy;
    sortOrder?: AttendanceSortOrder;
  }) {
    const nextDate = nextFilters.date ?? dateValue;
    const nextQuery = nextFilters.query ?? queryValue;
    const nextSortBy = nextFilters.sortBy ?? sortBy;
    const nextSortOrder = nextFilters.sortOrder ?? sortOrder;
    const params = new URLSearchParams();

    params.set("date", nextDate);

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    if (nextSortBy !== "timeIn") {
      params.set("sortBy", nextSortBy);
    }

    if (nextSortOrder !== "asc") {
      params.set("order", nextSortOrder);
    }

    const nextUrl = `${pathname}?${params.toString()}`;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  useEffect(() => {
    if (queryValue === query) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      replaceFilters({ query: queryValue });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [dateValue, pathname, query, queryValue, router, sortBy, sortOrder]);

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

  async function submitAction(action: AttendanceAction) {
    const targetRows = action === "time_out" ? selectedTimeOutRows : selectedRevertRows;
    const targetCount = targetRows.length;

    if (!canManage) {
      setError("Manual attendance actions are only available for today's Daily Logs.");
      setSuccess(null);
      return;
    }

    if (targetCount === 0) {
      setError(
        action === "time_out"
          ? "Select at least one timed-in person first."
          : "Select at least one completed time-out to revert.",
      );
      setSuccess(null);
      return;
    }

    const confirmationMessage =
      action === "time_out"
        ? `Time out ${targetCount} selected user${targetCount === 1 ? "" : "s"} for ${date}?`
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
          mode: "selected",
          userIds: targetRows.map((row) => row.id),
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
    <div className="space-y-4">
      <div className="space-y-3">
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
      </div>

      <div className="admin-card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="w-full xl:max-w-[220px]">
            <label className="admin-eyebrow mb-2 block">Date</label>
            <input
              type="date"
              value={dateValue}
              onChange={(event) => {
                const nextDate = event.target.value;
                setDateValue(nextDate);
                replaceFilters({ date: nextDate });
              }}
              className="admin-input"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:flex-1">
            <div className="w-full sm:flex-1">
              <label className="admin-eyebrow mb-2 block">Search</label>
              <input
                type="text"
                value={queryValue}
                onChange={(event) => setQueryValue(event.target.value)}
                placeholder="Search by name, email, or username"
                className="admin-input"
              />
            </div>

            <div className="flex items-center gap-2 sm:pb-0.5">
                <button
                  type="button"
                  onClick={() => replaceFilters({ sortBy: sortBy === "timeIn" ? "name" : "timeIn" })}
                  aria-label={sortBy === "timeIn" ? "Sorting by time in" : "Sorting by name"}
                  title={sortBy === "timeIn" ? "Sorting by time in" : "Sorting by name"}
                  className={`admin-button-secondary ${
                    sortBy === "timeIn" || sortBy === "name" ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]" : ""
                  } min-w-[46px] px-3`}
                >
                  {sortBy === "timeIn" ? <Clock3 className="h-4 w-4" /> : <span className="text-sm font-black">N</span>}
                </button>
                <button
                  type="button"
                  onClick={() => replaceFilters({ sortOrder: sortOrder === "asc" ? "desc" : "asc" })}
                  aria-label={sortOrder === "asc" ? "Ascending order" : "Descending order"}
                  title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
                  className={`admin-button-secondary ${
                    "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  } min-w-[46px] px-3`}
                >
                  {sortOrder === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
                </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--muted)]">
          {isRefreshing ? "Updating results..." : "Results update automatically when you change the date, search, or sorting."}
        </p>
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

      {showFloatingActions ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="pointer-events-auto md:hidden">
            <div className="flex items-center gap-2">
              {hasRevertAction ? (
                <button
                  type="button"
                  className="admin-button-secondary min-w-[46px] px-3"
                  aria-label="Revert selected time-out"
                  disabled={busy}
                  onClick={() => submitAction("revert_time_out")}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
              {hasTimeOutAction ? (
                <button
                  type="button"
                  className="admin-button-danger min-w-[46px] px-3"
                  aria-label="Time out selected"
                  disabled={busy}
                  onClick={() => submitAction("time_out")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-auto hidden md:block">
            <div className="flex items-center gap-2">
              {hasRevertAction ? (
                <button
                  type="button"
                  className="admin-button-secondary min-w-[190px]"
                  disabled={busy}
                  onClick={() => submitAction("revert_time_out")}
                >
                  <RotateCcw className="h-4 w-4" />
                  {busy ? "Updating..." : "Revert selected time-out"}
                </button>
              ) : null}
              {hasTimeOutAction ? (
                <button
                  type="button"
                  className="admin-button-danger min-w-[170px]"
                  disabled={busy}
                  onClick={() => submitAction("time_out")}
                >
                  <X className="h-4 w-4" />
                  {busy ? "Updating..." : "Time out selected"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
