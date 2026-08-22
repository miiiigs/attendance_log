import { ApplicationReviewManager } from "../../../components/application-review-manager";
import { getPlatformApplications } from "../../../lib/data/platform";

export const dynamic = "force-dynamic";

export default async function PlatformApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const currentStatus =
    status === "pending" || status === "approved" || status === "rejected" ? status : "all";
  const applications = await getPlatformApplications(currentStatus);

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
          {(["all", "pending", "approved", "rejected"] as const).map((value) => (
            <a
              key={value}
              href={value === "all" ? "/admin/applications" : `/admin/applications?status=${value}`}
              className={currentStatus === value ? "admin-button" : "admin-button-secondary"}
            >
              {value === "all" ? "All" : value[0]?.toUpperCase() + value.slice(1)}
            </a>
          ))}
        </div>
      </section>

      <ApplicationReviewManager applications={applications} />
    </div>
  );
}
