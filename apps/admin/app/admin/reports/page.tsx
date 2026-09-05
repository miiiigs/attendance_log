import { Flag, ShieldCheck } from "lucide-react";
import { formatDateTimeInTimeZone } from "@attendance/shared";
import { ReportModerationActions, RestoreActivityAction } from "../../../components/moderation-actions";
import { getPlatformModerationQueue } from "../../../lib/data/platform";

const PLATFORM_TIMEZONE = "Asia/Manila";

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export default async function PlatformReportsPage() {
  const queue = await getPlatformModerationQueue();

  return (
    <section className="space-y-6">
      <div>
        <p className="admin-eyebrow">Moderation</p>
        <h1 className="admin-page-title mt-3">Activity Reports</h1>
        <p className="admin-page-subtitle mt-2">
          Review reported activity content and organizer reports before a production build is submitted.
        </p>
      </div>

      <section className="admin-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <Flag className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Pending reports</h2>
        </div>

        {queue.pendingReports.length ? (
          <div className="space-y-4">
            {queue.pendingReports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="admin-chip admin-chip-warning">{humanize(report.reason)}</span>
                      <span className="admin-chip admin-chip-soft capitalize">{report.targetType}</span>
                      <span className="admin-chip admin-chip-soft capitalize">{report.activityModerationStatus}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{report.activityName}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {report.organizationName
                        ? `${report.organizationName} (${report.organizationCode ?? "no code"})`
                        : "Public activity"}
                      {" · "}
                      Creator {report.creatorEmail ?? "unavailable"}
                    </p>
                    <p className="mt-1 text-xs font-mono text-[var(--muted)]">
                      Reported {formatDateTimeInTimeZone(report.createdAt, PLATFORM_TIMEZONE)}
                    </p>
                    {report.details ? (
                      <p className="mt-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                        {report.details}
                      </p>
                    ) : null}
                  </div>
                  <ReportModerationActions reportId={report.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <ShieldCheck className="h-7 w-7 text-[#d2d5dc]" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">No pending reports</p>
              <p className="mt-1 text-xs text-[var(--muted)]">New user reports will appear here for platform review.</p>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[var(--muted)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Hidden activities</h2>
        </div>

        {queue.hiddenActivities.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Source</th>
                  <th>Moderated</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.hiddenActivities.map((activity) => (
                  <tr key={activity.id} className="admin-table-row">
                    <td className="font-medium text-[var(--foreground)]">{activity.name}</td>
                    <td className="text-sm text-[var(--muted)]">
                      {activity.organizationName
                        ? `${activity.organizationName} (${activity.organizationCode ?? "no code"})`
                        : "Public activity"}
                    </td>
                    <td className="font-mono text-xs text-[var(--muted)]">
                      {activity.moderatedAt ? formatDateTimeInTimeZone(activity.moderatedAt, PLATFORM_TIMEZONE) : "N/A"}
                    </td>
                    <td className="max-w-md text-sm text-[var(--muted)]">{activity.moderationReason ?? "Hidden by moderator"}</td>
                    <td>
                      <RestoreActivityAction activityId={activity.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No activities are currently hidden by moderation.</p>
        )}
      </section>
    </section>
  );
}
