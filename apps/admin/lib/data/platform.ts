import { DEFAULT_TIMEZONE, getFullName } from "@attendance/shared";
import { suggestOrganizationCode } from "../organizations";
import { createSupabaseServerClient } from "../supabase/server";

export interface PlatformMetric {
  label: string;
  value: number;
  hint: string;
}

export interface PlatformApplicationListItem {
  id: string;
  organizationName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationType: string | null;
  estimatedMemberCount: number | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
  suggestedCode: string;
  suggestedTimezone: string;
}

export interface PlatformOrganizationListItem {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  timezone: string;
  createdAt: string;
  approvedAt: string | null;
  memberCount: number;
  adminCount: number;
  primaryAdminName: string;
  primaryAdminEmail: string;
  attendanceRecordCount: number;
}

export interface PlatformOrganizationDetail {
  organization: {
    id: string;
    name: string;
    code: string;
    slug: string;
    status: "active" | "suspended" | "archived";
    timezone: string;
    createdAt: string;
    approvedAt: string | null;
  };
  memberCount: number;
  adminCount: number;
  attendanceRecordCount: number;
  administrators: Array<{
    id: string;
    username: string;
    name: string;
    email: string;
    status: string;
    joinedAt: string;
  }>;
  members: Array<{
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joinedAt: string;
  }>;
  recentAttendance: Array<{
    id: string;
    attendanceDate: string;
    timeIn: string | null;
    timeOut: string | null;
    name: string;
    email: string;
  }>;
}

function mapApplication(
  application: {
    id: string;
    organization_name: string;
    contact_first_name: string;
    contact_last_name: string;
    contact_email: string;
    organization_type: string | null;
    estimated_member_count: number | null;
    message: string | null;
    status: "pending" | "approved" | "rejected";
    reviewed_at: string | null;
    created_at: string;
  },
): PlatformApplicationListItem {
  return {
    id: application.id,
    organizationName: application.organization_name,
    contactFirstName: application.contact_first_name,
    contactLastName: application.contact_last_name,
    contactEmail: application.contact_email,
    organizationType: application.organization_type,
    estimatedMemberCount: application.estimated_member_count,
    message: application.message,
    status: application.status,
    reviewedAt: application.reviewed_at,
    createdAt: application.created_at,
    suggestedCode: suggestOrganizationCode(application.organization_name),
    suggestedTimezone: DEFAULT_TIMEZONE,
  };
}

export async function getPlatformDashboardData() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  const [
    organizationsCountResult,
    activeOrganizationsCountResult,
    pendingApplicationsCountResult,
    activeMembershipsCountResult,
    attendanceRecordsCountResult,
    recentApplicationsResult,
    recentOrganizationsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("organization_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .gte("attendance_date", monthStart)
      .lt("attendance_date", nextMonthStart),
    supabase
      .from("organization_applications")
      .select(
        "id, organization_name, contact_first_name, contact_last_name, contact_email, organization_type, estimated_member_count, message, status, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("organizations")
      .select("id, name, code, slug, status, timezone, created_at, approved_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const metrics: PlatformMetric[] = [
    {
      label: "Organizations",
      value: organizationsCountResult.count ?? 0,
      hint: "Approved workspaces on the platform",
    },
    {
      label: "Active Organizations",
      value: activeOrganizationsCountResult.count ?? 0,
      hint: "Organizations currently allowed to operate",
    },
    {
      label: "Pending Applications",
      value: pendingApplicationsCountResult.count ?? 0,
      hint: "Requests waiting for platform review",
    },
    {
      label: "Total Platform Members",
      value: activeMembershipsCountResult.count ?? 0,
      hint: "Active organization memberships across the platform",
    },
    {
      label: "Attendance Logs This Month",
      value: attendanceRecordsCountResult.count ?? 0,
      hint: "Current operational metric until activity history replaces attendance-only reporting",
    },
  ];

  return {
    metrics,
    recentApplications: (recentApplicationsResult.data ?? []).map(mapApplication),
    recentOrganizations: (recentOrganizationsResult.data ?? []),
  };
}

export async function getPlatformApplications(status: "all" | "pending" | "approved" | "rejected" = "all") {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("organization_applications")
    .select(
      "id, organization_name, contact_first_name, contact_last_name, contact_email, organization_type, estimated_member_count, message, status, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data ?? []).map(mapApplication);
}

export async function getPlatformOrganizations() {
  const supabase = await createSupabaseServerClient();
  const [{ data: organizations }, { data: memberships }, { data: records }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, code, slug, status, timezone, created_at, approved_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_memberships")
      .select(
        "id, organization_id, username, role, status, created_at, profiles!organization_memberships_user_id_fkey(first_name, last_name, email)",
      )
      .eq("status", "active"),
    supabase.from("attendance_records").select("id, organization_id"),
  ]);

  const membershipMap = new Map<string, typeof memberships>();
  const recordCounts = new Map<string, number>();

  for (const membership of memberships ?? []) {
    const current = membershipMap.get(membership.organization_id) ?? [];
    current.push(membership);
    membershipMap.set(membership.organization_id, current);
  }

  for (const record of records ?? []) {
    recordCounts.set(record.organization_id, (recordCounts.get(record.organization_id) ?? 0) + 1);
  }

  return (organizations ?? []).map((organization) => {
    const organizationMemberships = membershipMap.get(organization.id) ?? [];
    const administrators = organizationMemberships.filter((membership) => membership.role === "organization_admin");
    const primaryAdmin = administrators[0];
    const primaryAdminProfile = Array.isArray(primaryAdmin?.profiles) ? primaryAdmin?.profiles[0] : primaryAdmin?.profiles;

    return {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      slug: organization.slug,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.created_at,
      approvedAt: organization.approved_at,
      memberCount: organizationMemberships.length,
      adminCount: administrators.length,
      primaryAdminName: primaryAdminProfile
        ? getFullName(primaryAdminProfile.first_name, primaryAdminProfile.last_name)
        : "Unassigned",
      primaryAdminEmail: primaryAdminProfile?.email ?? "N/A",
      attendanceRecordCount: recordCounts.get(organization.id) ?? 0,
    } satisfies PlatformOrganizationListItem;
  });
}

export async function getPlatformOrganizationById(id: string): Promise<PlatformOrganizationDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, code, slug, status, timezone, created_at, approved_at")
    .eq("id", id)
    .maybeSingle();

  if (!organization) {
    return null;
  }

  const [{ data: memberships }, { data: recentAttendance }, { count: attendanceRecordCount }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select(
        "id, username, role, status, created_at, profiles!organization_memberships_user_id_fkey(first_name, last_name, email)",
      )
      .eq("organization_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("attendance_records")
      .select(
        "id, attendance_date, time_in, time_out, profiles!attendance_records_user_id_fkey(first_name, last_name, email)",
      )
      .eq("organization_id", id)
      .order("attendance_date", { ascending: false })
      .limit(10),
    supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("organization_id", id),
  ]);

  const mappedMembers = (memberships ?? []).map((membership) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;

    return {
      id: membership.id,
      username: membership.username,
      name: profile ? getFullName(profile.first_name, profile.last_name) : "Unknown",
      email: profile?.email ?? "N/A",
      role: membership.role,
      status: membership.status,
      joinedAt: membership.created_at,
    };
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      slug: organization.slug,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.created_at,
      approvedAt: organization.approved_at,
    },
    memberCount: mappedMembers.filter((member) => member.status === "active").length,
    adminCount: mappedMembers.filter((member) => member.role === "organization_admin" && member.status === "active").length,
    attendanceRecordCount: attendanceRecordCount ?? 0,
    administrators: mappedMembers.filter((member) => member.role === "organization_admin"),
    members: mappedMembers,
    recentAttendance: (recentAttendance ?? []).map((record) => {
      const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;

      return {
        id: record.id,
        attendanceDate: record.attendance_date,
        timeIn: record.time_in,
        timeOut: record.time_out,
        name: profile ? getFullName(profile.first_name, profile.last_name) : "Unknown",
        email: profile?.email ?? "N/A",
      };
    }),
  };
}
