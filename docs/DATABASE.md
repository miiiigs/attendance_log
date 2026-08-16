# Database

## Tables

### `profiles`

- one row per auth user
- stores person identity, admin role, and active or inactive status

### `attendance_records`

- one row per person per Manila-local date
- guarded by `unique(user_id, attendance_date)`

### `attendance_scans`

- append-only audit trail of successful time in and time out actions

### `qr_sessions`

- stores hashed short-lived QR tokens
- supports active, expired, and revoked status

### `app_settings`

- stores organization name, timezone, work hours, and grace period

## Important Constraints

- `profiles.username` is unique
- `profiles.email` is unique
- `attendance_records(user_id, attendance_date)` is unique
- `attendance_records.time_out >= time_in`
- `qr_sessions.expires_at > valid_from`

## Attendance Engine

`scan_attendance(qr_token)`:

1. requires authentication
2. locks per-user-per-day using an advisory transaction lock
3. verifies the profile exists and is an active person
4. validates the QR token against a hashed active session
5. computes the attendance date in `Asia/Manila`
6. creates a time-in record, updates a time-out record, or rejects a third scan
7. writes an audit row only for successful mutations

## RLS Summary

- people can only read their own profile and attendance history
- admins can read all rows through `public.is_admin()`
- direct person writes to attendance tables are not allowed
- QR and settings access is admin-only
