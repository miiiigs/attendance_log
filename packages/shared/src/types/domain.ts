import type {
  ACTIVITY_STATUSES,
  ACTIVITY_VISIBILITIES,
  ATTENDANCE_SCAN_TYPES,
  ORGANIZATION_APPLICATION_STATUSES,
  ORGANIZATION_MEMBERSHIP_ROLES,
  ORGANIZATION_STATUSES,
  PLATFORM_ROLES,
  PROFILE_ROLES,
  PROFILE_STATUSES,
  QR_SESSION_STATUSES,
} from "../constants/app";

export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type AttendanceScanType = (typeof ATTENDANCE_SCAN_TYPES)[number];
export type QrSessionStatus = (typeof QR_SESSION_STATUSES)[number];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export type ActivityVisibility = (typeof ACTIVITY_VISIBILITIES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type OrganizationMembershipRole = (typeof ORGANIZATION_MEMBERSHIP_ROLES)[number];
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
export type OrganizationApplicationStatus = (typeof ORGANIZATION_APPLICATION_STATUSES)[number];

export interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ProfileRole;
  platformRole?: PlatformRole;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  username: string;
  role: OrganizationMembershipRole;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationApplication {
  id: string;
  organizationName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationType: string | null;
  estimatedMemberCount: number | null;
  message: string | null;
  status: OrganizationApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  attendanceDate: string;
  timeIn: string | null;
  timeOut: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  organizationName: string;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  gracePeriodMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceMutationResult {
  attendanceRecordId: string;
  attendanceDate: string;
  scanType: AttendanceScanType;
  scannedAt: string;
  timeIn: string | null;
  timeOut: string | null;
  message: string;
}

export interface Activity {
  id: string;
  organizationId: string | null;
  name: string;
  status: ActivityStatus;
  visibility: ActivityVisibility;
  startedAt: string;
  endedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string | null;
  activityId: string;
  membershipId: string | null;
  userId: string;
  timeIn: string;
  timeOut: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityScanMutationResult {
  activityLogId: string;
  activityId: string;
  activityName: string;
  scanType: AttendanceScanType;
  scannedAt: string;
  timeIn: string | null;
  timeOut: string | null;
  message: string;
}

export interface OrganizationJoinAuthorization {
  id: string;
  organizationId: string;
  normalizedEmail: string;
  status: string;
  createdBy: string | null;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
