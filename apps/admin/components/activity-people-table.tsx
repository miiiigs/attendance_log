"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { formatTimeInTimeZone, getFullName } from "@attendance/shared";
import type { ActivityPersonRow } from "../lib/data/org";

type FilterValue = "all" | "logged" | "not_logged";
type SortValue = "name_asc" | "name_desc" | "time_in_asc" | "time_in_desc";

const PAGE_SIZE = 15;

function getStatus(row: ActivityPersonRow) {
  if (!row.timeIn) {
    return "not_logged";
  }
  if (!row.timeOut) {
    return "logged";
  }
  return "completed";
}

export function ActivityPeopleTable({
  people,
  timezone,
}: {
  people: ActivityPersonRow[];
  timezone: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("name_asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = people.filter((row) => {
      const status = getStatus(row);
      if (filter === "logged" && status === "not_logged") {
        return false;
      }
      if (filter === "not_logged" && status !== "not_logged") {
        return false;
      }
      if (!term) {
        return true;
      }
      return [row.firstName, row.lastName, getFullName(row.firstName, row.lastName), row.username, row.email]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    rows = [...rows].sort((first, second) => {
      if (sort === "name_asc" || sort === "name_desc") {
        const comparison = getFullName(first.firstName, first.lastName).localeCompare(
          getFullName(second.firstName, second.lastName),
          undefined,
          { sensitivity: "base" },
        );
        return sort === "name_asc" ? comparison : -comparison;
      }

      const firstTime = first.timeIn ? new Date(first.timeIn).getTime() : Number.POSITIVE_INFINITY;
      const secondTime = second.timeIn ? new Date(second.timeIn).getTime() : Number.POSITIVE_INFINITY;
      const comparison = firstTime - secondTime;
      return sort === "time_in_asc" ? comparison : -comparison;
    });

    return rows;
  }, [filter, people, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(() => {
    const logged = people.filter((row) => row.timeIn).length;
    return {
      total: people.length,
      logged,
      notLogged: people.length - logged,
      completed: people.filter((row) => row.timeOut).length,
    };
  }, [people]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, username, or email..."
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as SortValue);
            setPage(1);
          }}
          className="admin-select"
          aria-label="Sort people"
        >
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="time_in_asc">Time In Earliest</option>
          <option value="time_in_desc">Time In Latest</option>
        </select>

        <button
          type="button"
          className="admin-button-secondary"
          onClick={() => setPage(1)}
          aria-label="Filter people"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {filter !== "all" ? (
        <div className="flex flex-wrap gap-2">
          <span className="admin-chip admin-chip-soft">
            {filter === "logged" ? "Timed In" : "Not Yet Logged"} · {filter === "logged" ? counts.logged : counts.notLogged}
          </span>
          <button type="button" onClick={() => setFilter("all")} className="text-xs font-semibold text-[var(--accent)]">
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`admin-chip ${filter === "all" ? "admin-chip-success" : "admin-chip-soft"}`}
        >
          All · {counts.total}
        </button>
        <button
          type="button"
          onClick={() => setFilter("logged")}
          className={`admin-chip ${filter === "logged" ? "admin-chip-success" : "admin-chip-soft"}`}
        >
          Timed In · {counts.logged}
        </button>
        <button
          type="button"
          onClick={() => setFilter("not_logged")}
          className={`admin-chip ${filter === "not_logged" ? "admin-chip-warning" : "admin-chip-soft"}`}
        >
          Not Yet Logged · {counts.notLogged}
        </button>
      </div>

      <div className="admin-table-shell">
        {pageRows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Username</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const status = getStatus(row);
                  const label = status === "completed" ? "Completed" : status === "logged" ? "Timed In" : "Not Logged";
                  const tone = status === "completed" ? "admin-chip-success" : status === "logged" ? "admin-chip-soft" : "admin-chip-warning";

                  return (
                    <tr key={row.membershipId} className="admin-table-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                            {getFullName(row.firstName, row.lastName)
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part[0] ?? "")
                              .join("")
                              .toUpperCase() || row.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-[var(--foreground)]">
                            {getFullName(row.firstName, row.lastName) || row.username}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[var(--muted)]">{row.username}</td>
                      <td className="font-mono text-sm text-[var(--foreground)]">
                        {formatTimeInTimeZone(row.timeIn, timezone)}
                      </td>
                      <td className="font-mono text-sm text-[var(--foreground)]">
                        {formatTimeInTimeZone(row.timeOut, timezone)}
                      </td>
                      <td>
                        <span className={`admin-chip capitalize ${tone}`}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p className="text-sm font-medium text-[var(--foreground)]">No people match the current filters.</p>
            <p className="text-xs text-[var(--muted)]">Adjust the search or filter to see results.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          {filtered.length} {filtered.length === 1 ? "person" : "people"} · page {safePage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={safePage <= 1}
            className="admin-button-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={safePage >= totalPages}
            className="admin-button-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
