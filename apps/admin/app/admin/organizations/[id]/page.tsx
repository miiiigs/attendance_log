import Link from "next/link";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { notFound } from "next/navigation";
import { OrganizationStatusManager } from "../../../../components/organization-status-manager";
import { getPlatformOrganizationById } from "../../../../lib/data/platform";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlatformOrganizationById(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="admin-eyebrow">Organization Detail</p>
            <h1 className="mt-4 admin-page-title">{detail.organization.name}</h1>
            <p className="admin-page-subtitle mt-2">
              Code: <span className="font-mono text-[var(--foreground)]">{detail.organization.code}</span> · Timezone:{" "}
              <span className="text-[var(--foreground)]">{detail.organization.timezone}</span>
            </p>
            <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
              <p>
                Slug: <span className="font-mono text-[var(--foreground)]">/org/{detail.organization.slug}</span>
              </p>
              <p>
                Created: <span className="text-[var(--foreground)]">{new Date(detail.organization.createdAt).toLocaleDateString("en-US")}</span>
              </p>
              <p>
                Approved:{" "}
                <span className="text-[var(--foreground)]">
                  {detail.organization.approvedAt ? new Date(detail.organization.approvedAt).toLocaleString("en-US") : "Not recorded"}
                </span>
              </p>
              <p>
                Status: <span className="capitalize text-[var(--foreground)]">{detail.organization.status}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <span
              className={
                detail.organization.status === "active"
                  ? "admin-chip admin-chip-success"
                  : detail.organization.status === "suspended"
                    ? "admin-chip admin-chip-warning"
                    : "admin-chip admin-chip-soft"
              }
            >
              {detail.organization.status}
            </span>
            <OrganizationStatusManager organizationId={detail.organization.id} currentStatus={detail.organization.status} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="admin-kpi">
          <span className="admin-kpi-label">Members</span>
          <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{detail.memberCount}</p>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-label">Administrators</span>
          <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{detail.adminCount}</p>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi-label">Activities</span>
          <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{detail.activityCount}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="admin-table-shell overflow-x-auto">
          <div className="border-b border-[#f0ede5] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Organization administrators</h2>
          </div>
          <table className="admin-table min-w-[620px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {detail.administrators.map((administrator) => (
                <tr key={administrator.id} className="admin-table-row">
                  <td>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{administrator.name}</p>
                      <p className="text-xs text-[var(--muted)]">{administrator.email}</p>
                    </div>
                  </td>
                  <td className="font-mono text-sm text-[var(--foreground)]">{administrator.username}</td>
                  <td className="text-sm capitalize text-[var(--foreground)]">{administrator.status}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(administrator.joinedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-table-shell overflow-x-auto">
          <div className="border-b border-[#f0ede5] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent activities</h2>
          </div>
          <table className="admin-table min-w-[620px]">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Status</th>
                <th>Started</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentActivities.map((activity) => (
                <tr key={activity.id} className="admin-table-row">
                  <td className="font-medium text-[var(--foreground)]">{activity.name}</td>
                  <td className="text-sm capitalize text-[var(--foreground)]">{activity.status}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {formatDateTimeInTimeZone(activity.startedAt, detail.organization.timezone)}
                  </td>
                  <td className="text-xs text-[var(--muted)]">
                    {activity.endedAt ? formatDateTimeInTimeZone(activity.endedAt, detail.organization.timezone) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-table-shell overflow-x-auto">
        <div className="border-b border-[#f0ede5] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Organization members</h2>
        </div>
        <table className="admin-table min-w-[760px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {detail.members.map((member) => (
              <tr key={member.id} className="admin-table-row">
                <td>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{member.name}</p>
                    <p className="text-xs text-[var(--muted)]">{member.email}</p>
                  </div>
                </td>
                <td className="font-mono text-sm text-[var(--foreground)]">{member.username}</td>
                <td className="text-sm capitalize text-[var(--foreground)]">{member.role.replace("_", " ")}</td>
                <td className="text-sm capitalize text-[var(--foreground)]">{member.status}</td>
                <td className="text-xs text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(member.joinedAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div>
        <Link href="/admin/organizations" className="admin-button-secondary">
          Back to organizations
        </Link>
      </div>
    </div>
  );
}
