# AGENTS.md

pnpm monorepo for the QRLog platform: a multi-tenant, QR-backed activity-tracking
system (Expo mobile + Next.js admin + Supabase). SCPPA is the first organization.

## Layout

- `apps/admin` — Next.js 16 (App Router): `/admin*` platform console + `/org/[slug]/*` organization consoles + `/apply`
- `apps/mobile` — Expo Router 57 / React Native mobile app (organization-code login + activity scanning)
- `packages/shared` — `@attendance/shared` workspace pkg: zod schemas, constants, domain types, date/time helpers
- `supabase` — migrations, `seed.sql`, pgTAP tests, local `config.toml`
- `e2e` — Playwright local browser smoke test (`e2e/activity-flow.spec.ts`, seed helpers)
- `scripts` — tsx one-offs (bootstrap, auth sync, e2e seed/build)
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
pnpm e2e                       # Playwright smoke against LOCAL Supabase (builds admin with local env)
pnpm e2e:seed                  # reseed local E2E identities only
pnpm e2e:install               # download Playwright chromium once
```

- `supabase` CLI is NOT on PATH; use `pnpm exec supabase ...`.
- vitest is not a root dep; run a single test via `pnpm -C apps/admin exec vitest run lib/server/onboarding-email.test.ts` (same pattern for `packages/shared`).
- DB tests are pgTAP in `supabase/tests/` (attendance + activity foundation); run `pnpm exec supabase test db` with local Supabase up.
- `pnpm e2e` must not run against hosted Supabase: it builds the admin app with local (127.0.0.1) `NEXT_PUBLIC_*` env inlined and uses local-only identities. Never point `E2E_*` env vars at a hosted project.

## Routes (canonical)

- Platform: `/admin`, `/admin/applications`, `/admin/organizations`, `/admin/organizations/[id]`
- Organization: `/org/[slug]/dashboard|activities|activities/[id]|current-activity|people|people/[id]|settings`
- Public: `/apply`; neutral org picker: `/choose-org`
- Legacy single-org routes (`/attendance`, `/qr`, `/employees`, `/people`, `/settings`) are redirect stubs to the organization console; `/` redirects platform admins to `/admin` and org admins to their console.

## Auth model (easy to get wrong)

- Mobile login identity is **organization code + membership username + password** (`POST /api/auth/mobile-login`). The server resolves organization → membership → global profile → the actual Auth email via `auth.admin.getUserById` → password grant. `profiles.username` is legacy and NOT login authority.
- Admin login is username → derived auth email `{username}@attendance.local`.
- The same global Auth user can be a member of multiple organizations; membership usernames are organization-scoped and may repeat across organizations.
- After renaming/creating profiles, run `pnpm sync:auth-usernames` to keep auth emails aligned.

## Database rules

- **Never write activity/attendance rows from clients.** Mutations go through `scan_activity(qr_token)` (Activity flow) or `scan_attendance(qr_token)` (legacy daily flow). Mobile only submits raw QR tokens.
- QR tokens are stored hashed only; the raw display token is kept in an httpOnly admin cookie (cleared on revoke/end). Sessions are short-lived and revocable.
- Activity/attendance dates derive from each organization's `timezone` (`organizations.timezone`) in SQL; timestamps are `timestamptz`. SCPPA = `Asia/Manila`.
- One active Activity per organization is enforced by a partial unique index; activity logs are unique per `(activity_id, membership_id)` (not per date).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (admin server code + scripts). Never in browser/Expo bundles.
- Migrations are forward-only and numbered `YYYYMMDDNNNN_*`. Never edit an applied migration; add a new one. New migrations should be idempotent (guarded create/insert) so `supabase db reset` works cleanly.

## Env handling

- Root `.env` (gitignored) is loaded by scripts via `process.loadEnvFile(".env")`; app secrets also live in app-level `.env.local`.
- Admin needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; mobile uses `EXPO_PUBLIC_*` (incl. `EXPO_PUBLIC_ADMIN_APP_URL`).
- The mobile backend URL helper (`apps/mobile/lib/config.ts`) refuses local addresses in production builds.
- Optional n8n onboarding webhook: `N8N_ONBOARDING_WEBHOOK_URL` + `N8N_ONBOARDING_WEBHOOK_SECRET` (server-only, shared via `X-Attendance-Webhook-Secret` header). Empty = manual email fallback.
- Bootstrap overridable via `ADMIN_BOOTSTRAP_*` / `PLATFORM_ADMIN_BOOTSTRAP_*` env vars.

## Local E2E gotchas

- The local CLI Supabase stack does NOT grant `service_role` table privileges by default; the E2E seed grants them locally (hosted grants them by default, so no migration change). This is required for the app's service-role paths (mobile-login, people onboarding) when running against local Supabase.
- The E2E seeds deterministic local identities (`e2e.admin`, `202699001`, `202700001`, org `E2EB`) and resets prior E2E state; `pnpm exec supabase test db` still passes with them present.
- `next dev` showed flaky chunk/HMR behavior on Windows in this repo; the E2E builds the admin with local env and serves via `next start` instead.

## Current state

- Multi-tenant platform is committed on `feat/multitenant-activity-foundation`: organizations, memberships, org-scoped username counters, activities/activity_logs/activity_scans, org-aware QR, RLS fail-closed, org-aware login, and organization consoles. Legacy attendance SQL tables are preserved (compatibility/history); the Activity flow is the primary path.
- Legacy `api/admin/people*`, `api/admin/employees*`, `api/admin/attendance/*`, `api/admin/settings` were removed; org mutations live under `/api/org/[slug]/*` (route-authorized).
