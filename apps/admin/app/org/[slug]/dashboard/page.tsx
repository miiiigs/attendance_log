import Link from "next/link";
import { ArrowRight, CalendarClock, Users, Zap } from "lucide-react";
import {
  formatDateTimeInTimeZone,
  formatTimeInTimeZone,
} from "@attendance/shared";
import {
  getCurrentActivityQr,
  getCurrentActivitySummary,
  getOrgDashboard,
} from "../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../lib/org-auth";

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);
  const timezone = organization.timezone;
  const dashboard = await getOrgDashboard(organization.id, timezone);

  const currentSummary = dashboard.currentActivity
    ? await getCurrentActivitySummary(organization.id, dashboard.currentActivity.id)
    : null;
  const currentQr = dashboard.currentActivity ? await getCurrentActivityQr(dashboard.currentActivity.id) : null;

  return (
    <div className="space-y-6">
      <section className="admin-card p-6 sm:p-7">
        <p className="admin-eyebrow">{organization.name}</p>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="admin-page-title">Organization dashboard</h1>
            <p className="admin-page-subtitle mt-2">
              {organization.name} · {organization.code} · {timezone}
            </p>
          </div>
          <Link href={`/org/${slug}/current-activity`} className="admin-button">
            <Zap className="h-4 w-4" />
            {dashboard.currentActivity ? "View Current Activity" : "Start Activity"}
          </Link>
        </div>
      </section>

      {dashboard.currentActivity ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <article className="admin-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="admin-eyebrow">Current Activity</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {dashboard.currentActivity.name}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Started {formatDateTimeInTimeZone(dashboard.currentActivity.started_at, timezone)}
                </p>
              </div>
              <span className="admin-chip admin-chip-success">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                In progress
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="admin-kpi">
                <p className="admin-kpi-label">Logged</p>
                <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{currentSummary?.logged ?? 0}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">of {currentSummary?.total ?? 0} members</p>
              </div>
              <div className="admin-kpi">
                <p className="admin-kpi-label">Not Yet Logged</p>
                <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{currentSummary?.notLogged ?? 0}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">still missing</p>
              </div>
              <div className="admin-kpi">
                <p className="admin-kpi-label">Completed</p>
                <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{currentSummary?.completed ?? 0}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">time in + out</p>
              </div>
              <div className="admin-kpi">
                <p className="admin-kpi-label">Timed In</p>
                <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{currentSummary?.open ?? 0}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">in, no time out</p>
              </div>
            </div>
          </article>

          <article className="admin-card p-6">
            <p className="admin-eyebrow">Current QR</p>
            {currentQr ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Status</span>
                    <span className="font-semibold text-[var(--accent)]">Active</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Valid until</span>
                    <span className="font-mono text-xs text-[var(--foreground)]">
                      {formatTimeInTimeZone(currentQr.expires_at, timezone)}
                    </span>
                  </div>
                </div>
                <Link href={`/org/${slug}/current-activity`} className="admin-button w-full justify-start">
                  Open QR Fullscreen
                </Link>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#fde68a] bg-[var(--warning-soft)] px-4 py-4 text-sm text-[var(--foreground)]">
                <p className="font-semibold text-[var(--warning)]">No active QR</p>
                <p className="mt-1">Generate a QR from the current activity page so members can start logging.</p>
              </div>
            )}
          </article>
        </section>
      ) : (
        <section className="admin-card p-6">
          <div className="admin-empty-state">
            <Zap className="h-7 w-7 text-[#d2d5dc]" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">No current activity</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Start a new activity to begin logging participants.</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/org/${slug}/current-activity`} className="admin-button">
              <Zap className="h-4 w-4" />
              Start New Activity
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="admin-kpi">
          <p className="admin-kpi-label">Total People</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{dashboard.metrics.totalPeople}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">active members in this organization</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">Total Activities</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{dashboard.metrics.totalActivities}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">all-time activities</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">This Month</p>
          <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{dashboard.metrics.activitiesThisMonth}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">activities started this month</p>
        </article>
        <article className="admin-kpi">
          <p className="admin-kpi-label">Most Recent</p>
          <p className="text-xl font-bold tracking-[-0.03em] text-[var(--foreground)]">
            {dashboard.metrics.mostRecentActivity?.name ?? "—"}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {dashboard.metrics.mostRecentActivity
              ? formatDateTimeInTimeZone(dashboard.metrics.mostRecentActivity.startedAt, timezone)
              : "no activities yet"}
          </p>
        </article>
      </section>

      <section className="admin-table-shell">
        <div className="flex items-center justify-between border-b border-[#f0ede5] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent activities</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Latest activity history for this organization.</p>
          </div>
          <Link href={`/org/${slug}/activities`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {dashboard.recentActivities.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Logged</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivities.map((activity) => (
                  <tr key={activity.id} className="admin-table-row">
                    <td className="font-medium text-[var(--foreground)]">{activity.name}</td>
                    <td className="text-xs text-[var(--muted)]">
                      {formatDateTimeInTimeZone(activity.startedAt, timezone)}
                    </td>
                    <td className="font-mono text-sm text-[var(--foreground)]">{activity.loggedCount}</td>
                    <td>
                      <span className={`admin-chip capitalize ${activity.status === "active" ? "admin-chip-success" : "admin-chip-soft"}`}>
                        {activity.status}
                      </span>
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
              <p className="text-sm font-medium text-[var(--foreground)]">No activities yet</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Activities will appear here once you start one.</p>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card-flat flex items-center gap-2.5 px-4 py-3.5">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
        <p className="text-xs leading-6 text-[var(--muted)]">
          All activity timestamps follow {organization.name}&apos;s timezone ({timezone}).
        </p>
      </section>
    </div>
  );
}
