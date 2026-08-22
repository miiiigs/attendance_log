import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFullName } from "@attendance/shared";
import { getOrgPeople, type OrgPeopleSort } from "../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../lib/org-auth";

const SORTS: Array<{ value: OrgPeopleSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
];

export default async function OrgPeoplePage({
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
  const status = typeof queryParams.status === "string" ? queryParams.status : "all";
  const sort = (typeof queryParams.sort === "string" ? queryParams.sort : "newest") as OrgPeopleSort;

  const result = await getOrgPeople(organization.id, { page, pageSize: 15, query, status, sort });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function buildHref(nextParams: { page?: string; query?: string; status?: string; sort?: string }) {
    const merged = new URLSearchParams();
    merged.set("page", nextParams.page ?? String(page));
    merged.set("query", nextParams.query ?? query);
    merged.set("status", nextParams.status ?? status);
    merged.set("sort", nextParams.sort ?? sort);
    return `/org/${slug}/people?${merged.toString()}`;
  }

  const start = result.total === 0 ? 0 : (page - 1) * result.pageSize + 1;
  const end = Math.min(page * result.pageSize, result.total);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-eyebrow">{organization.code}</p>
          <h1 className="admin-page-title mt-3">People</h1>
          <p className="admin-page-subtitle mt-2">Manage members of {organization.name}.</p>
        </div>
        <Link href={`/org/${slug}/people/new`} className="admin-button">
          + Add Person
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="admin-chip admin-chip-success">{result.activeCount} active</span>
        <span className="admin-chip admin-chip-soft">{result.inactiveCount} inactive</span>
        <span className="admin-chip admin-chip-soft">{result.total} total</span>
      </div>

      <form className="admin-card grid gap-4 p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center">
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Search people..."
          className="admin-input"
        />
        <select name="status" defaultValue={status} className="admin-select">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
        {result.people.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.people.map((person) => (
                  <tr key={person.membershipId} className="admin-table-row">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                          {(person.firstName[0] ?? "").toUpperCase()}
                          {(person.lastName[0] ?? "").toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--foreground)]">
                          {getFullName(person.firstName, person.lastName) || person.username}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-[var(--muted)]">{person.username}</td>
                    <td className="text-sm text-[var(--muted)]">{person.email}</td>
                    <td>
                      <span className="admin-chip admin-chip-soft capitalize">{person.membershipRole.replace("_", " ")}</span>
                    </td>
                    <td>
                      <span className={`admin-chip ${person.membershipStatus === "active" ? "admin-chip-success" : "admin-chip-soft"} capitalize`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${person.membershipStatus === "active" ? "bg-[var(--accent)]" : "bg-[#9da3ad]"}`} />
                        {person.membershipStatus}
                      </span>
                    </td>
                    <td>
                      <Link href={`/org/${slug}/people/${person.userId}`} className="text-sm font-semibold text-[var(--accent)]">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p className="text-sm font-medium text-[var(--foreground)]">No people match the current filters.</p>
            <p className="text-xs text-[var(--muted)]">Adjust the search or add a new person to continue.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          Showing {start}–{end} of {result.total} {result.total === 1 ? "person" : "people"} · page {page} of {totalPages}
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
