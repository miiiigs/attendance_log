import type {
  ATTENDANCE_SCAN_TYPES,
  PROFILE_ROLES,
  PROFILE_STATUSES,
  QR_SESSION_STATUSES,
} from "../constants/app";

export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type AttendanceScanType = (typeof ATTENDANCE_SCAN_TYPES)[number];
export type QrSessionStatus = (typeof QR_SESSION_STATUSES)[number];

export interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
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
