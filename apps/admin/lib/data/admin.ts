import {
  DEFAULT_GRACE_PERIOD_MINUTES,
  DEFAULT_TIMEZONE,
  DEFAULT_WORK_START_TIME,
  getFullName,
  isLate,
} from "@attendance/shared";
import { createSupabaseServerClient } from "../supabase/server";

export interface DashboardStats {
  activePeople: number;
  presentToday: number;
  completedToday: number;
  notYetLoggedToday: number;
}

export interface AttendanceRow {
  id: string;
  username: string;
  name: string;
  email: string;
  timeIn: string | null;
  timeOut: string | null;
  state: string;
  late: boolean;
  canTimeOut: boolean;
  canRevertTimeOut: boolean;
}

export type AttendanceSortBy = "timeIn" | "name";
export type AttendanceSortOrder = "asc" | "desc";

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [{ data: activePeople }, { data: records }, { data: scans }, { data: settings }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("role", "person").eq("status", "active"),
      supabase
        .from("attendance_records")
        .select("id, user_id, time_in, time_out")
        .eq("attendance_date", today),
      supabase
        .from("attendance_scans")
        .select(
          "id, scan_type, scanned_at, profiles!attendance_scans_user_id_fkey(email, first_name, last_name)",
        )
        .order("scanned_at", { ascending: false })
        .limit(10),
      supabase
        .from("app_settings")
        .select("work_start_time, grace_period_minutes")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const dashboardStats: DashboardStats = {
    activePeople: activePeople?.length ?? 0,
    presentToday: records?.length ?? 0,
    completedToday: records?.filter((record) => record.time_out).length ?? 0,
    notYetLoggedToday:
      (records?.filter((record) => record.time_in && !record.time_out).length ?? 0) +
      Math.max((activePeople?.length ?? 0) - (records?.length ?? 0), 0),
  };

  const recentScans =
    scans?.map((scan) => {
      const employee = Array.isArray(scan.profiles) ? scan.profiles[0] : scan.profiles;
      return {
        id: scan.id,
        scannedAt: scan.scanned_at,
        scanType: scan.scan_type,
        personName: employee ? getFullName(employee.first_name, employee.last_name) : "Unknown",
        email: employee?.email ?? "N/A",
      };
    }) ?? [];

  const lateToday =
    records?.filter((record) =>
      isLate(
        record.time_in,
        settings?.work_start_time ?? DEFAULT_WORK_START_TIME,
        settings?.grace_period_minutes ?? DEFAULT_GRACE_PERIOD_MINUTES,
      ),
    ).length ?? 0;

  return { dashboardStats, recentScans, lateToday, today };
}

export async function getEmployees(params: {
  query?: string;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let builder = supabase
    .from("profiles")
    .select("id, username, first_name, last_name, email, role, status, created_at")
    .eq("role", "person")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    builder = builder.eq("status", params.status);
  }

  const { data } = await builder;
  const search = params.query?.trim().toLowerCase();

  return (data ?? []).filter((profile) => {
    if (!search) {
      return true;
    }

    return [
      profile.username,
      profile.first_name,
      profile.last_name,
      profile.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

export async function getEmployeeById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, email, role, status")
    .eq("id", id)
    .eq("role", "person")
    .maybeSingle();

  return data;
}

export async function getAttendanceRows(params: {
  date: string;
  query?: string;
  sortBy?: AttendanceSortBy;
  sortOrder?: AttendanceSortOrder;
}): Promise<AttendanceRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: employees }, { data: records }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, first_name, last_name, email, role, status")
      .eq("role", "person")
      .eq("status", "active")
      .order("first_name", { ascending: true }),
    supabase
      .from("attendance_records")
      .select("id, user_id, attendance_date, time_in, time_out")
      .eq("attendance_date", params.date),
    supabase
      .from("app_settings")
      .select("work_start_time, grace_period_minutes")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const recordMap = new Map((records ?? []).map((record) => [record.user_id, record]));
  const search = params.query?.trim().toLowerCase();
  const sortBy = params.sortBy ?? "timeIn";
  const sortOrder = params.sortOrder ?? "asc";

  const rows = (employees ?? [])
    .filter((employee) => {
      const searchMatches =
        !search ||
        [employee.username, employee.email, employee.first_name, employee.last_name]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return searchMatches;
    })
    .map((employee) => {
      const record = recordMap.get(employee.id);
      return {
        id: employee.id,
        username: employee.username,
        name: getFullName(employee.first_name, employee.last_name),
        email: employee.email,
        timeIn: record?.time_in ?? null,
        timeOut: record?.time_out ?? null,
        state: !record ? "Absent / Not yet logged" : record.time_out ? "Completed" : "Timed in",
        canTimeOut: Boolean(record?.time_in && !record?.time_out),
        canRevertTimeOut: Boolean(record?.time_in && record?.time_out),
        late: isLate(
          record?.time_in ?? null,
          settings?.work_start_time ?? DEFAULT_WORK_START_TIME,
          settings?.grace_period_minutes ?? DEFAULT_GRACE_PERIOD_MINUTES,
        ),
      };
    });

  function compareNames(first: AttendanceRow, second: AttendanceRow) {
    return first.name.localeCompare(second.name, undefined, { sensitivity: "base" });
  }

  function compareTimeIn(first: AttendanceRow, second: AttendanceRow) {
    if (first.timeIn && second.timeIn) {
      return first.timeIn.localeCompare(second.timeIn);
    }

    if (first.timeIn && !second.timeIn) {
      return -1;
    }

    if (!first.timeIn && second.timeIn) {
      return 1;
    }

    return 0;
  }

  rows.sort((first, second) => {
    const direction = sortOrder === "asc" ? 1 : -1;
    const primaryComparison =
      sortBy === "name"
        ? compareNames(first, second)
        : compareTimeIn(first, second);

    if (primaryComparison !== 0) {
      return primaryComparison * direction;
    }

    return compareNames(first, second);
  });

  return rows;
}

export async function getSettings() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("id, organization_name, timezone, work_start_time, work_end_time, grace_period_minutes")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}
