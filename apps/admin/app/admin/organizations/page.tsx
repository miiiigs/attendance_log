import Link from "next/link";
import { OrganizationStatusManager } from "../../../components/organization-status-manager";
import { getPlatformOrganizations } from "../../../lib/data/platform";

export const dynamic = "force-dynamic";

function buildOrganizationsHref(input: {
  status: "all" | "active" | "suspended" | "archived";
  query: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.status !== "active") {
    params.set("status", input.status);
  }

  if (input.query) {
    params.set("query", input.query);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const queryString = params.toString();
  return queryString ? `/admin/organizations?${queryString}` : "/admin/organizations";
}

export default async function PlatformOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; query?: string; page?: string }>;
}) {
  const { status, query, page } = await searchParams;
  const currentStatus =
    status === "all" || status === "active" || status === "suspended" || status === "archived" ? status : "active";
  const currentQuery = (query ?? "").trim();
  const currentPage = Number.parseInt(page ?? "1", 10);
  const organizations = await getPlatformOrganizations({
    status: currentStatus,
    search: currentQuery,
    page: currentPage,
  });

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <p className="admin-eyebrow">Organizations</p>
        <h1 className="mt-4 admin-page-title">Manage approved organizations</h1>
        <p className="admin-page-subtitle mt-2 max-w-3xl">
          Keep each workspace isolated and operational. Suspension preserves historical data while blocking organization-admin
          operations and member scan activity until the organization is reactivated.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["active", "all", "suspended", "archived"] as const).map((value) => (
            <a
              key={value}
              href={buildOrganizationsHref({ status: value, query: currentQuery, page: 1 })}
              className={currentStatus === value ? "admin-button" : "admin-button-secondary"}
            >
              {value[0]?.toUpperCase() + value.slice(1)}
            </a>
          ))}
        </div>

        <form action="/admin/organizations" className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="status" value={currentStatus} />
          <input
            type="search"
            name="query"
            defaultValue={currentQuery}
            className="admin-input"
            placeholder="Search organization, code, or administrator"
          />
          <button type="submit" className="admin-button">
            Search
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Showing {organizations.items.length} of {organizations.totalCount} matching organizations.
        </p>
      </section>

      <div className="admin-table-shell overflow-x-auto">
        <table className="admin-table min-w-[1100px]">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Code</th>
              <th>Administrator</th>
              <th>Members</th>
              <th>Activities</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.items.map((organization) => (
              <tr key={organization.id} className="admin-table-row">
                <td>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{organization.name}</p>
                    <p className="text-xs text-[var(--muted)]">{organization.timezone}</p>
                  </div>
                </td>
                <td className="font-mono text-sm text-[var(--foreground)]">{organization.code}</td>
                <td>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{organization.primaryAdminName}</p>
                    <p className="text-xs text-[var(--muted)]">{organization.primaryAdminEmail}</p>
                  </div>
                </td>
                <td className="text-sm text-[var(--foreground)]">
                  {organization.memberCount}
                  <span className="text-xs text-[var(--muted)]"> total</span>
                </td>
                <td className="text-sm text-[var(--foreground)]">{organization.activityCount}</td>
                <td>
                  <span
                    className={
                      organization.status === "active"
                        ? "admin-chip admin-chip-success"
                        : organization.status === "suspended"
                          ? "admin-chip admin-chip-warning"
                          : "admin-chip admin-chip-soft"
                    }
                  >
                    {organization.status}
                  </span>
                </td>
                <td className="text-xs text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(organization.createdAt))}
                </td>
                <td>
                  <div className="flex flex-col gap-3">
                    <Link href={`/admin/organizations/${organization.id}`} className="admin-button-secondary">
                      View
                    </Link>
                    <OrganizationStatusManager organizationId={organization.id} currentStatus={organization.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {organizations.totalPages > 1 ? (
        <nav className="flex items-center justify-between">
          <a
            href={buildOrganizationsHref({
              status: currentStatus,
              query: currentQuery,
              page: Math.max(1, organizations.page - 1),
            })}
            className={organizations.page === 1 ? "admin-button-secondary pointer-events-none opacity-50" : "admin-button-secondary"}
          >
            Previous
          </a>
          <p className="text-sm text-[var(--muted)]">
            Page {organizations.page} of {organizations.totalPages}
          </p>
          <a
            href={buildOrganizationsHref({
              status: currentStatus,
              query: currentQuery,
              page: Math.min(organizations.totalPages, organizations.page + 1),
            })}
            className={
              organizations.page >= organizations.totalPages ? "admin-button-secondary pointer-events-none opacity-50" : "admin-button-secondary"
            }
          >
            Next
          </a>
        </nav>
      ) : null}
    </div>
  );
}
