import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { getOrgActivities, type ActivitySort } from "../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../lib/org-auth";

const SORTS: Array<{ value: ActivitySort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Activity Name A-Z" },
  { value: "name_desc", label: "Activity Name Z-A" },
];

export default async function OrgActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);

  const queryParams = await searchParams;
  const page = Number(typeof queryParams.page === "string" ? queryParams.page : "1") || 1;
  const query = typeof queryParams.query === "string" ? queryParams.query : "";
  const sort = (typeof queryParams.sort === "string" ? queryParams.sort : "newest") as ActivitySort;

  const result = await getOrgActivities(organization.id, { page, pageSize: 10, query, sort });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function buildHref(nextParams: Record<string, string>) {
    const merged = new URLSearchParams();
    if (query) merged.set("query", query);
    merged.set("sort", sort);
    merged.set("page", nextParams.page ?? String(page));
    if (nextParams.query !== undefined) {
      merged.set("query", nextParams.query);
    }
    if (nextParams.sort) merged.set("sort", nextParams.sort);
    return `/org/${slug}/activities?${merged.toString()}`;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-eyebrow">{organization.code}</p>
          <h1 className="admin-page-title mt-3">Activities</h1>
          <p className="admin-page-subtitle mt-2">Complete activity history for {organization.name}.</p>
        </div>
        <Link href={`/org/${slug}/current-activity`} className="admin-button">
          Start Activity
        </Link>
      </div>

      <form method="get" className="admin-card grid gap-4 p-4 md:grid-cols-[2fr_1fr_auto] md:items-center">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="page" value="1" />
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Search activities..."
          className="admin-input"
        />
        <select name="sort" defaultValue={sort} className="admin-select">
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="admin-button">Filter</button>
      </form>

      <div className="admin-table-shell">
        {result.activities.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Logged</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.activities.map((activity) => (
                  <tr key={activity.id} className="admin-table-row">
                    <td className="font-medium text-[var(--foreground)]">{activity.name}</td>
                    <td className="text-xs text-[var(--muted)]">
                      {new Intl.DateTimeFormat("en-CA", { timeZone: organization.timezone }).format(
                        new Date(activity.startedAt),
                      )}
                    </td>
                    <td className="font-mono text-xs text-[var(--muted)]">
                      {formatDateTimeInTimeZone(activity.startedAt, organization.timezone)}
                    </td>
                    <td className="font-mono text-xs text-[var(--muted)]">
                      {activity.endedAt ? formatDateTimeInTimeZone(activity.endedAt, organization.timezone) : "—"}
                    </td>
                    <td className="font-mono text-sm text-[var(--foreground)]">{activity.loggedCount}</td>
                    <td>
                      <span className={`admin-chip capitalize ${activity.status === "active" ? "admin-chip-success" : "admin-chip-soft"}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/org/${slug}/activities/${activity.id}`}
                        className="text-sm font-semibold text-[var(--accent)]"
                      >
                        View Activity
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CalendarClock className="h-7 w-7 text-[#d2d5dc]" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">No activities found</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Adjust the filters or start a new activity.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          {result.total} {result.total === 1 ? "activity" : "activities"} · page {result.page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildHref({ page: String(Math.max(1, page - 1)) })}
            aria-disabled={page <= 1}
            className="admin-button-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
          <Link
            href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}
            aria-disabled={page >= totalPages}
            className="admin-button-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
