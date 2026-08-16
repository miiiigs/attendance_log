# Architecture

## Overview

This repository is a pnpm monorepo with three main parts:

```text
apps/admin      Next.js admin dashboard
apps/mobile     Expo Router mobile app
packages/shared Shared schemas, constants, and helpers
supabase        Schema, RLS, RPCs, seeds, and database tests
```

## Trust Boundaries

```text
People Mobile
  |
  | Authenticated via Supabase Auth
  v
scan_attendance(qr_token)
  |
  | validates user, role, status, QR token, Manila date, and attendance state
  v
PostgreSQL tables
  ^
  | Admin reads through RLS-safe queries
  |
Admin Dashboard
```

The database is the source of truth for:

- role and account status
- attendance day determination
- time in versus time out decisioning
- duplicate prevention
- QR validity

## Admin App

The admin dashboard uses the Next.js App Router. Authenticated pages live under `app/(protected)`. Server-side data fetching uses a cookie-based Supabase client for RLS-safe reads and a service-role server client for admin-only mutations such as creating people and generating new credentials.

Person onboarding email is prepared by trusted server-only code first. The backend always generates the onboarding subject and body, then optionally attempts delivery through a self-hosted n8n webhook. If automation is unavailable, the prepared message is returned to the administrator for manual sending.

## Mobile App

The mobile app uses Expo Router with a small auth provider that restores the session on startup. Attendance scanning is the primary action. The app never writes attendance rows directly and instead submits raw QR tokens to `scan_attendance`.

## Database

The schema centers on:

- `profiles`
- `attendance_records`
- `attendance_scans`
- `qr_sessions`
- `app_settings`

Important rules are enforced with enums, foreign keys, unique constraints, RLS, and security-definer database functions.

## QR Flow

1. Admin opens the QR page.
2. Admin requests a short-lived QR token.
3. `create_qr_session` stores only the token hash.
4. The raw token is encoded into the QR payload.
5. Mobile scans and extracts the raw token.
6. Mobile calls `scan_attendance`.
7. The database hashes the token, validates the session, and writes the attendance mutation transactionally.

## Timezone Handling

Attendance dates are derived in PostgreSQL using `Asia/Manila`. Timestamps are stored in `TIMESTAMPTZ`, but the daily attendance key is always computed from Manila local time before mutation.
