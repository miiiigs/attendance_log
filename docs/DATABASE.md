# Database

## Core Tables

### `profiles`
- one row per global Auth user
- global identity: name, email, status, `platform_role` (`user` / `platform_admin`)
- `username` is a legacy globally-unique field; it is NOT login authority

### `organizations`
- tenant records with a normalized unique `code`, unique `slug`, `timezone`, and status (`active` / `suspended` / `archived`)
- RLS: platform admins and organization members can read; only platform admins write

### `organization_memberships`
- links a global user to an organization with an organization-scoped `username`, `role` (`organization_admin` / `member`), and `status`
- `UNIQUE(organization_id, user_id)` and `UNIQUE(organization_id, username)`
- the same username may exist in different organizations

### `organization_membership_username_counters`
- per `(organization_id, counter_type)` atomic counters for role-aware usernames
- `counter_type` uses the `organization_membership_role` enum (`organization_admin` / `member`), so admin and member sequences are independent and never cross-consume
- generation uses an atomic `INSERT ... ON CONFLICT ... RETURNING`; no application-side increments, and sequences never reset or reuse numbers

### `activities`
- one row per Activity; `UNIQUE(organization_id) WHERE status = 'active'` enforces one active Activity per organization at the database level
- `active -> ended` lifecycle with `ended_at`; ending revokes the Activity's QR sessions

### `activity_logs`
- participation rows keyed by `(activity_id, membership_id)` — NOT by date
- `UNIQUE(activity_id, membership_id)`; a member may join multiple Activities on one date
- composite foreign keys enforce that the activity and membership belong to the log's organization

### `activity_scans`
- append-only audit trail of activity scans (organization, activity, membership, QR session, scan type, time)

### `qr_sessions`
- stores only a `token_hash`, status (`active` / `expired` / `revoked`), validity window, and the owning organization + activity
- legacy daily-attendance sessions have a NULL `activity_id`

### `app_settings`
- legacy single global row; not part of the multi-tenant model (organization settings live on `organizations`)

## Legacy Attendance Tables

`attendance_records`, `attendance_scans`, and the legacy daily RPCs remain for backward
compatibility and historical data preservation. The primary flow for new events is the
Activity model. These tables were never dropped; `attendance_records` still carries
historical rows scoped by `organization_id`.

## Scan State Machine

`scan_activity(qr_token)`:

1. requires authentication
2. resolves the caller's active membership and its organization
3. validates the QR session (active, not expired/revoked) and that it belongs to the caller's organization
4. validates the Activity is active and belongs to that organization
5. locks on `(activity_id, membership_id)` (advisory lock + row locks)
6. the scan is time-in only; a member already timed in is rejected with guidance to
   use `leave_activity`, and a completed log is rejected outright
7. writes the activity log and an activity scan audit row

Members record their Time Out with `leave_activity`; ending an Activity
(`end_activity`) auto-completes still-open participants using the same timestamp as
`activities.ended_at`.

## Username Generation

- `generate_membership_username(organization_id, role)` returns the next role-aware username for that organization atomically:
  - `organization_admin` -> `<ORGCODE>_admin_<SEQUENCE>` (no padding), platform-admin only
  - `member` -> `<ORGCODE>_<SEQUENCE>` (minimum 4-digit padding), org-admin or platform-admin
- The organization code is resolved from `organizations.code` (canonical uppercase); it is never accepted from client input.
- The deprecated `generate_next_membership_username`/`generate_next_username` year-based generators were removed; new usernames never depend on the calendar year.

## RLS Summary

- people can read their own profile and their own activity logs/scans
- organization admins can read their organization's data; members read only what they joined
- platform admins have platform-wide access
- direct client writes to activity logs/scans are denied; all mutations go through security-definer RPCs
- composite foreign keys prevent cross-organization activity/membership/QR relationships structurally
