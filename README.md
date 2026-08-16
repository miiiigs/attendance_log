# People Attendance System

People Attendance System is a lightweight attendance MVP for a single organization. It includes:

- an Expo mobile app for people
- a Next.js admin dashboard
- a Supabase backend with RLS and QR-backed attendance mutation

## Repository Structure

```text
apps/admin
apps/mobile
packages/shared
supabase
docs
scripts
```

## Prerequisites

- Node.js 22+
- pnpm 11+
- Supabase CLI
- Expo Go or an Android emulator/device

## Setup

1. Copy `.env.example` values into app-specific `.env.local` files.
2. Run `pnpm install`.
3. Start Supabase with `pnpm supabase:start`.
4. Reset the database with `pnpm supabase:reset`.
5. Bootstrap the first admin:

```bash
pnpm bootstrap:admin
```

Default bootstrap admin credentials:

- username: `user`
- password: `password`
- profile name: `Admin User`

The bootstrap script creates the underlying Supabase auth email as `user@attendance.local` and the admin login form accepts the username `user`.

## Onboarding Email

Onboarding email delivery supports an optional self-hosted n8n webhook plus Gmail.

You need:

1. an optional self-hosted n8n instance
2. a Gmail or Google Workspace account connected to n8n
3. an onboarding webhook workflow
4. the webhook URL
5. a shared webhook secret

Server environment variables:

```env
N8N_ONBOARDING_WEBHOOK_URL=
N8N_ONBOARDING_WEBHOOK_SECRET=
```

Leave both empty if automated onboarding email is not available.

Person creation still succeeds, and the admin UI returns:

- the generated username
- the one-time temporary password
- a ready-to-send subject
- a ready-to-send email body
- copy actions for manual delivery

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
pnpm --filter admin build
```

## Notes

- attendance writes must go through `scan_attendance`
- service-role operations stay server-side only
- attendance dates are derived in `Asia/Manila`

See [docs/ARCHITECTURE.md](/C:/dev/attendance_log/docs/ARCHITECTURE.md), [docs/DATABASE.md](/C:/dev/attendance_log/docs/DATABASE.md), [docs/SECURITY.md](/C:/dev/attendance_log/docs/SECURITY.md), [docs/QA.md](/C:/dev/attendance_log/docs/QA.md), and [docs/DEPLOYMENT.md](/C:/dev/attendance_log/docs/DEPLOYMENT.md) for details.
