# AGENTS.md

pnpm monorepo for a QR-backed attendance system (Expo mobile + Next.js admin + Supabase).

## Layout

- `apps/admin` — Next.js 16 (App Router) admin dashboard
- `apps/mobile` — Expo Router 57 / React Native mobile app
- `packages/shared` — `@attendance/shared` workspace pkg: zod schemas, constants, domain types, date/time helpers
- `supabase` — migrations, `seed.sql`, pgTAP tests, local `config.toml`
- `scripts` — tsx one-offs (bootstrap, auth sync)
- `docs` — ARCHITECTURE / DATABASE / SECURITY / DEPLOYMENT / QA

Framework version warnings: `apps/admin/AGENTS.md` and `apps/mobile/AGENTS.md` are committed and point to versioned docs (Next 16 and Expo SDK 57 differ from training data). Don't delete them.

## Commands (run from root)

```bash
pnpm dev:admin                 # Next dev
pnpm dev:mobile                # expo start
pnpm lint                      # eslint (admin) + tsc --noEmit (shared)
pnpm typecheck
pnpm test                      # vitest in admin + shared
pnpm build                     # admin only
pnpm supabase:start|stop|reset # reset reapplies all migrations + seed.sql
pnpm bootstrap:admin           # tsx scripts/bootstrap-admin.ts
pnpm sync:auth-usernames       # realign auth emails to profile usernames
```

- `supabase` CLI is NOT on PATH; use `pnpm exec supabase ...`.
- vitest is not a root dep; run a single test via `pnpm -C apps/admin exec vitest run lib/server/onboarding-email.test.ts` (same pattern for `packages/shared`).
- DB tests are pgTAP in `supabase/tests/attendance.test.sql`; run `pnpm exec supabase test db` with local Supabase up.

## Auth model (easy to get wrong)

- Login identity is a **username**, not an email. Auth email is derived: `{username}@attendance.local` (`usernameToAuthEmail` in `packages/shared`). Person usernames are 9-digit `YYYYNNNNN`.
- Admin signs in with username (default `user` / `password`). Mobile signs in via `POST /api/auth/mobile-login`, which resolves username→profile email server-side then does a Supabase password grant.
- After renaming/creating profiles, run `pnpm sync:auth-usernames` to keep auth emails aligned.

## Database rules

- **Never write attendance rows from clients.** All mutations go through `scan_attendance(qr_token)` (validates QR, role, status, Manila date, time in/out). Mobile only submits raw QR tokens; admin uses server-side service-role client.
- QR tokens are stored hashed only; sessions are short-lived and can be revoked.
- Attendance dates derive from `Asia/Manila` in SQL; timestamps are `timestamptz`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (admin server code + scripts). Never in browser/Expo bundles.
- Migrations are forward-only and numbered `YYYYMMDDNNNN_*`. Never edit an applied migration; add a new one. New migrations should be idempotent (guarded create/insert) so `supabase db reset` works cleanly.

## Env handling

- Root `.env` (gitignored) is loaded by scripts via `process.loadEnvFile(".env")`; app secrets also live in app-level `.env.local`.
- Admin needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; mobile uses `EXPO_PUBLIC_*`.
- Optional n8n onboarding webhook: `N8N_ONBOARDING_WEBHOOK_URL` + `N8N_ONBOARDING_WEBHOOK_SECRET` (server-only, shared via `X-Attendance-Webhook-Secret` header). Empty = manual email fallback.
- Bootstrap overridable via `ADMIN_BOOTSTRAP_*` / `PLATFORM_ADMIN_BOOTSTRAP_*` env vars.

## Current state

- Working tree has a large **uncommitted multitenant-platform refactor** in progress: untracked `supabase/migrations/202608180001_multitenant_platform_foundation.sql`, new admin routes (`app/admin/*`, `app/apply/*`, `api/platform/*`, `api/applications/*`), and new shared types/schemas. README/docs still describe the original single-org MVP. Preserve this uncommitted work and don't "clean up" apparent dead code without checking it.
- Platform model: `organizations`, `organization_memberships`, `organization_applications`, `platform_role`, plus org-scoped username counters. `bootstrap-admin` now also seeds platform_admin + SCPPA org membership.
