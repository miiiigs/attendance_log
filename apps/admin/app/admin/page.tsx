import Link from "next/link";
import { ArrowRight, Building2, ClipboardList } from "lucide-react";
import { getPlatformDashboardData } from "../../lib/data/platform";

function metricTint(index: number) {
  const values = [
    "bg-[rgba(22,101,52,0.1)] text-[var(--accent)]",
    "bg-[rgba(15,118,110,0.1)] text-[#0f766e]",
    "bg-[rgba(180,83,9,0.1)] text-[var(--warning)]",
    "bg-[rgba(14,116,144,0.1)] text-[#0e7490]",
    "bg-[rgba(109,113,120,0.1)] text-[#6d7178]",
  ];

  return values[index % values.length] ?? values[0];
}

export default async function PlatformAdminPage() {
  const { metrics, recentApplications, recentOrganizations } = await getPlatformDashboardData();

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <p className="admin-eyebrow">Platform Overview</p>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="admin-page-title">Run every organization from one secure control layer</h1>
            <p className="admin-page-subtitle mt-2 max-w-3xl">
              Review incoming applications, approve organizations, and keep an eye on the platform-wide operational pulse while
              the organization-specific activity model continues moving underneath the same product.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/applications" className="admin-button">
              Review applications
            </Link>
            <Link href="/apply" className="admin-button-secondary">
              Open public apply page
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <article key={metric.label} className="admin-kpi">
            <div className="mb-4 flex items-center justify-between">
              <span className="admin-kpi-label">{metric.label}</span>
              <div className={`admin-icon-badge h-9 w-9 ${metricTint(index)}`}>
                {index % 2 === 0 ? <Building2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{metric.value}</p>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{metric.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="admin-table-shell">
          <div className="flex items-center justify-between border-b border-[#f0ede5] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent applications</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Newest platform requests first.</p>
            </div>
            <Link href="/admin/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
              Open queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentApplications.length ? (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((application) => (
                    <tr key={application.id} className="admin-table-row">
                      <td>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{application.organizationName}</p>
                          {application.organizationType ? (
                            <p className="text-xs text-[var(--muted)]">{application.organizationType}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-sm text-[var(--foreground)]">
                        <div>{application.contactFirstName} {application.contactLastName}</div>
                        <div className="text-xs text-[var(--muted)]">{application.contactEmail}</div>
                      </td>
                      <td>
                        <span
                          className={
                            application.status === "approved"
                              ? "admin-chip admin-chip-success"
                              : application.status === "rejected"
                                ? "admin-chip admin-chip-danger"
                                : "admin-chip admin-chip-warning"
                          }
                        >
                          {application.status}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="admin-table-shell">
          <div className="flex items-center justify-between border-b border-[#f0ede5] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent organizations</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Latest approved workspaces on the platform.</p>
            </div>
            <Link href="/admin/organizations" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOrganizations.length ? (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrganizations.map((organization) => (
                    <tr key={organization.id} className="admin-table-row">
                      <td>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{organization.name}</p>
                          <p className="text-xs text-[var(--muted)]">{organization.timezone}</p>
                        </div>
                      </td>
                      <td className="font-mono text-sm text-[var(--foreground)]">{organization.code}</td>
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
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(organization.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
