import Link from "next/link";
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
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Slug: <span className="font-mono text-[var(--foreground)]">/org/{detail.organization.slug}</span>
            </p>
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
          <span className="admin-kpi-label">Attendance Records</span>
          <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{detail.attendanceRecordCount}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="admin-table-shell overflow-x-auto">
          <div className="border-b border-[#f0ede5] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Organization members</h2>
          </div>
          <table className="admin-table min-w-[680px]">
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
        </div>

        <div className="space-y-4">
          <div className="admin-table-shell overflow-x-auto">
            <div className="border-b border-[#f0ede5] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent attendance</h2>
            </div>
            <table className="admin-table min-w-[460px]">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                </tr>
              </thead>
              <tbody>
                {detail.recentAttendance.map((record) => (
                  <tr key={record.id} className="admin-table-row">
                    <td>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{record.name}</p>
                        <p className="text-xs text-[var(--muted)]">{record.email}</p>
                      </div>
                    </td>
                    <td className="text-xs text-[var(--muted)]">{record.attendanceDate}</td>
                    <td className="text-xs text-[var(--foreground)]">{record.timeIn ? new Date(record.timeIn).toLocaleString("en-US") : "—"}</td>
                    <td className="text-xs text-[var(--foreground)]">{record.timeOut ? new Date(record.timeOut).toLocaleString("en-US") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Next layer reminder</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              This platform view already manages applications and tenant status. The next major refactor is moving the current
              single-organization admin routes under <span className="font-mono text-[var(--foreground)]">/org/[slug]</span>.
            </p>
            <div className="mt-4">
              <Link href="/admin/organizations" className="admin-button-secondary">
                Back to organizations
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
