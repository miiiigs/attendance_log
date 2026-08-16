import { DEFAULT_TIMEZONE, formatAttendanceDate } from "@attendance/shared";
import { AttendanceLogManager } from "../../../components/attendance-log-manager";
import { getAttendanceRows } from "../../../lib/data/admin";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const date = typeof params.date === "string" ? params.date : today;
  const query = typeof params.query === "string" ? params.query : "";
  const sortBy = params.sortBy === "name" ? "name" : "timeIn";
  const sortOrder = params.order === "desc" ? "desc" : "asc";
  const rows = await getAttendanceRows({ date, query, sortBy, sortOrder });
  const presentCount = rows.filter((row) => row.timeIn).length;
  const completedCount = rows.filter((row) => row.timeOut).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="admin-eyebrow">Attendance</p>
          <h1 className="admin-page-title mt-3">Daily logs</h1>
          <p className="admin-page-subtitle mt-2">{formatAttendanceDate(date)}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="admin-chip admin-chip-soft">{rows.length} records</span>
          <span className="admin-chip admin-chip-success">{presentCount} present</span>
          <span className="admin-chip admin-chip-warning">{completedCount} completed</span>
        </div>
      </div>

      <AttendanceLogManager
        date={date}
        query={query}
        sortBy={sortBy}
        sortOrder={sortOrder}
        rows={rows}
        today={today}
      />
    </section>
  );
}
