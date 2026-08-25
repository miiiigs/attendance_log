# Architecture

## Overview

This repository is a pnpm monorepo implementing a multi-tenant QRLog platform:

```text
apps/admin      Next.js App Router (platform admin + organization consoles)
apps/mobile     Expo Router mobile app (organization-aware login + activity scanning)
packages/shared Shared schemas, constants, and helpers
supabase        Schema, RLS, RPCs, seeds, and database tests
e2e             Playwright local browser smoke test
```

## Identity Model

```text
auth.users
    |
global profiles        (global identity: name, email, status, platform_role)
    |
organization_memberships   (username, role, status per organization)
    |
organizations              (active / suspended / archived)
```

One Supabase Auth user may belong to multiple organizations. Login identity is
**organization code + membership username + password**; the global `profiles.username`
field is legacy and is never used as login authority.

- `platform_admin` (global role) operates the platform console.
- `organization_admin` and `member` (per-membership roles) operate the organization
  console and mobile app respectively.

## Organization Console

The organization console lives under `/org/[slug]/*` and is guarded server-side by
`requireOrgAdmin`: an active `organization_admin` membership for that organization (or
a platform admin). Every page resolves the organization from the route slug and filters
all queries by the authorized organization id.

Routes:

```text
/org/[slug]/dashboard
/org/[slug]/activities
/org/[slug]/activities/[id]
/org/[slug]/current-activity
/org/[slug]/people
/org/[slug]/people/[id]
/org/[slug]/settings
```

Legacy single-organization routes (`/attendance`, `/qr`, `/employees`, `/people`) are
thin redirect stubs: they resolve the caller's eligible organization(s) and redirect to
the matching organization console. If a user has multiple eligible organization-admin
memberships, they land on a neutral `/choose-org` page instead of auto-selecting one.

## Activity Flow

1. An organization admin starts an Activity from Current Activity.
2. Starting creates the Activity and automatically generates its QR (5-hour TTL by default).
3. The raw QR token is returned once and kept in an httpOnly admin cookie for display;
   the database stores only the token hash.
4. A member scans the QR with the mobile app. `scan_activity` resolves the membership,
   validates the QR/activity/organization, and records Time In (first scan) or Time Out
   (second scan); a third scan is rejected.
5. Ending an Activity revokes its QR sessions and marks it ended; history is preserved
   and time-outs are never fabricated.

Concurrency is keyed on `(activity_id, membership_id)` via advisory locks; a member may
participate in multiple Activities on the same calendar date.

## Trust Boundaries

```text
People Mobile
  |
  | organization code + username + password -> /api/auth/mobile-login (server resolves
  | organization, membership, global profile, Auth identity; password grant)
  v
scan_activity(qr_token)
  |
  | validates membership, organization, QR session, activity, and scan state
  v
PostgreSQL tables
  ^
  | reads through RLS-safe, organization-scoped queries
  |
Organization Admin Console
```

The database is the source of truth for membership, activity state, QR validity, and
tenant isolation (RLS + composite foreign keys + security-definer authorization helpers).

## Mobile App

The mobile app authenticates with organization code + username + password through the
admin backend login bridge. The session provider holds the Supabase session, the global
profile, and the resolved organization + membership context (persisted in SecureStore and
revalidated against the database). Home shows the active organization and current
activity; the scanner submits the raw QR token to `scan_activity`.

## Database

Core tables: `profiles`, `organizations`, `organization_memberships`,
`organization_membership_username_counters`, `activities`, `activity_logs`, `activity_scans`,
`qr_sessions`, and legacy `attendance_records`/`attendance_scans`. See `DATABASE.md`.

## Timezone Handling

Activity timestamps are displayed and computed in each organization's configured timezone
(`organizations.timezone`, SCPPA = `Asia/Manila`). The database derives attendance/activity
dates in the organization timezone before mutation.
