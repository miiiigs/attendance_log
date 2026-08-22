import { ApplicationReviewManager } from "../../../components/application-review-manager";
import { getPlatformApplications } from "../../../lib/data/platform";

export const dynamic = "force-dynamic";

function buildApplicationsHref(input: {
  status: "all" | "pending" | "approved" | "rejected";
  query: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.status !== "pending") {
    params.set("status", input.status);
  }

  if (input.query) {
    params.set("query", input.query);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const queryString = params.toString();
  return queryString ? `/admin/applications?${queryString}` : "/admin/applications";
}

export default async function PlatformApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; query?: string; page?: string }>;
}) {
  const { status, query, page } = await searchParams;
  const currentStatus =
    status === "all" || status === "approved" || status === "rejected" || status === "pending" ? status : "pending";
  const currentQuery = (query ?? "").trim();
  const currentPage = Number.parseInt(page ?? "1", 10);
  const applications = await getPlatformApplications({
    status: currentStatus,
    search: currentQuery,
    page: currentPage,
  });

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <p className="admin-eyebrow">Applications</p>
        <h1 className="mt-4 admin-page-title">Review organization requests</h1>
        <p className="admin-page-subtitle mt-2 max-w-3xl">
          Each submission remains pending until you deliberately approve or reject it. Approval creates the organization, seeds
          the first admin membership, and prepares onboarding credentials with automated-email fallback when needed.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["pending", "all", "approved", "rejected"] as const).map((value) => (
            <a
              key={value}
              href={buildApplicationsHref({ status: value, query: currentQuery, page: 1 })}
              className={currentStatus === value ? "admin-button" : "admin-button-secondary"}
            >
              {value[0]?.toUpperCase() + value.slice(1)}
            </a>
          ))}
        </div>

        <form action="/admin/applications" className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="status" value={currentStatus} />
          <input
            type="search"
            name="query"
            defaultValue={currentQuery}
            className="admin-input"
            placeholder="Search organization, contact name, or contact email"
          />
          <button type="submit" className="admin-button">
            Search
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Showing {applications.items.length} of {applications.totalCount} matching applications.
        </p>
      </section>

      <ApplicationReviewManager applications={applications.items} />

      {applications.totalPages > 1 ? (
        <nav className="flex items-center justify-between">
          <a
            href={buildApplicationsHref({
              status: currentStatus,
              query: currentQuery,
              page: Math.max(1, applications.page - 1),
            })}
            className={applications.page === 1 ? "admin-button-secondary pointer-events-none opacity-50" : "admin-button-secondary"}
          >
            Previous
          </a>
          <p className="text-sm text-[var(--muted)]">
            Page {applications.page} of {applications.totalPages}
          </p>
          <a
            href={buildApplicationsHref({
              status: currentStatus,
              query: currentQuery,
              page: Math.min(applications.totalPages, applications.page + 1),
            })}
            className={
              applications.page >= applications.totalPages ? "admin-button-secondary pointer-events-none opacity-50" : "admin-button-secondary"
            }
          >
            Next
          </a>
        </nav>
      ) : null}
    </div>
  );
}
