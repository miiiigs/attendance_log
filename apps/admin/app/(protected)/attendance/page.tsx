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
  const rows = await getAttendanceRows({ date, query });
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

      <form className="admin-card flex flex-col gap-4 p-4 md:grid md:grid-cols-[1fr_2fr_auto] md:items-center">
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="admin-input"
        />
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Search by name, email, or username"
          className="admin-input"
        />
        <button className="admin-button">
          Apply filters
        </button>
      </form>

      <AttendanceLogManager date={date} rows={rows} today={today} />
    </section>
  );
}
