import Link from "next/link";
import { OrganizationStatusManager } from "../../../components/organization-status-manager";
import { getPlatformOrganizations } from "../../../lib/data/platform";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationsPage() {
  const organizations = await getPlatformOrganizations();

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <p className="admin-eyebrow">Organizations</p>
        <h1 className="mt-4 admin-page-title">Manage approved organizations</h1>
        <p className="admin-page-subtitle mt-2 max-w-3xl">
          Keep each workspace isolated and operational. Suspension preserves historical data while blocking organization-admin
          operations and member scan activity until the organization is reactivated.
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
              <th>Records</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization) => (
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
                <td className="text-sm text-[var(--foreground)]">{organization.attendanceRecordCount}</td>
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
    </div>
  );
}
