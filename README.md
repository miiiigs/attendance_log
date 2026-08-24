# QRLog

QRLog is a multi-tenant activity-tracking platform: a Next.js admin dashboard, an Expo mobile app, and a Supabase backend with RLS and QR-backed activity scanning.

- **Platform Admin** manages organizations and applications (`/admin`): review, approve, reject, suspend, reactivate.
- **Organization Admin** runs each tenant's console (`/org/[slug]/*`): Activities, Current Activity, People, Settings.
- **People** scan Activity QR codes from the mobile app (first scan = Time In, second = Time Out).

## Repository Structure

```text
apps/admin      Next.js 16 App Router admin dashboard (platform + organization consoles)
apps/mobile     Expo Router 57 mobile app
packages/shared @attendance/shared workspace package (zod schemas, constants, domain types, date/time helpers)
supabase        migrations, seed.sql, pgTAP tests, local config.toml
e2e             Playwright local browser smoke test
scripts         tsx one-offs (bootstrap, auth sync, E2E seed/build)
docs            ARCHITECTURE / DATABASE / SECURITY / DEPLOYMENT / QA
```

## Prerequisites

- Node.js 22+
- pnpm 11+
- Supabase CLI (`pnpm exec supabase`)
- Expo Go or an Android emulator/device (mobile)
- Docker (local Supabase)

## Setup

1. Copy `.env.example` values into app-specific `.env.local` files.
2. Run `pnpm install`.
3. Start Supabase with `pnpm supabase:start`.
4. Reset the database with `pnpm supabase:reset` (applies all migrations + seed.sql).
5. Bootstrap the platform admin:

```bash
pnpm bootstrap:admin
```

Default bootstrap admin credentials: username `user`, password `password`. The bootstrap script creates the Supabase auth identity as `user@attendance.local` and seeds the SCPPA organization membership.

## Supported Routes

```text
PUBLIC        /apply                 organization application
PLATFORM      /admin                 platform overview
              /admin/applications
              /admin/organizations
              /admin/organizations/[id]
ORGANIZATION  /org/[slug]/dashboard
              /org/[slug]/activities
              /org/[slug]/activities/[id]
              /org/[slug]/current-activity
              /org/[slug]/people
              /org/[slug]/people/[id]
              /org/[slug]/settings
MOBILE        organization code + username + password login
```

Legacy single-organization routes (`/attendance`, `/qr`, `/employees`, `/people`) redirect authenticated organization admins to the matching organization console. Platform admins land on `/admin`.

## Development

```bash
pnpm dev:admin
pnpm dev:mobile
```

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec supabase test db   # pgTAP, requires local Supabase running
pnpm e2e                     # local browser smoke (starts local-key admin build + Playwright)
pnpm e2e:install             # download the Playwright chromium browser once
```

## Notes

- Login identity is an organization code + username (membership-scoped), not an email.
- Platform approval creates organizations server-side, reuses existing global users when possible, and falls back to copyable onboarding email content when automation is unavailable.
- Attendance/activity writes always go through `scan_activity`/`scan_attendance` database functions.
- QR tokens are stored hashed; raw display tokens are retained in an httpOnly admin cookie.
- Activity timestamps use each organization's configured timezone.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (admin server code + scripts). Never in browser/Expo bundles.

See `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/QA.md`, and `docs/DEPLOYMENT.md` for details.
