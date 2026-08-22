export const APP_NAME = "Activity Log";
export const ORGANIZATION_NAME = "Your Organization";
export const ORGANIZATION_SHORT_NAME = "Organization";
export const ADMIN_PORTAL_NAME = "Activity Log Admin";
export const DEFAULT_TIMEZONE = "Asia/Manila";
export const DEFAULT_QR_TTL_SECONDS = 12 * 60 * 60;
export const DEFAULT_WORK_START_TIME = "08:00";
export const DEFAULT_WORK_END_TIME = "17:00";
export const DEFAULT_GRACE_PERIOD_MINUTES = 10;

export const PROFILE_ROLES = ["person", "admin"] as const;
export const PROFILE_STATUSES = ["active", "inactive"] as const;
export const QR_SESSION_STATUSES = ["active", "expired", "revoked"] as const;
export const ATTENDANCE_SCAN_TYPES = ["time_in", "time_out"] as const;
export const PLATFORM_ROLES = ["user", "platform_admin"] as const;
export const ORGANIZATION_MEMBERSHIP_ROLES = ["organization_admin", "member"] as const;
export const ORGANIZATION_STATUSES = ["active", "suspended", "archived"] as const;
export const ORGANIZATION_APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
