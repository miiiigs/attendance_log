# Deployment

## Admin

The admin dashboard is designed for low-cost Next.js hosting (e.g. Vercel hobby). Routes:

- `/admin*` — platform admin console
- `/org/[slug]/*` — organization consoles
- `/apply` — public organization application
- `/api/*` — API routes (auth bridge, organization APIs, platform APIs)

Required server environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `N8N_ONBOARDING_WEBHOOK_URL`
- optional `N8N_ONBOARDING_WEBHOOK_SECRET`

## Mobile

Use Expo for development and internal Android distribution. For V1, an APK or internal
EAS build is sufficient.

Required mobile environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ADMIN_APP_URL` — the admin backend base URL used by the login bridge and
  any mobile-originated server calls. Production builds refuse local addresses
  (localhost/127.0.0.1/private ranges) so a production build can never silently target them.

## Backend

Provision a single Supabase project, run the committed SQL migrations, and seed the
SCPPA organization + platform admin via `pnpm bootstrap:admin`.

## Onboarding Email

Automated onboarding email is optional via a self-hosted n8n webhook. Leave the n8n
variables empty for the manual email fallback (the admin UI returns a ready-to-send
subject/body).

## Local Development Notes

- `pnpm exec supabase test db` and `pnpm e2e` require the local Supabase stack (Docker).
- The local CLI stack does not grant `service_role` table privileges by default; the
  E2E setup grants them locally. Hosted Supabase grants `service_role` by default, so no
  migration change is needed.
- `pnpm e2e` builds the admin app with the local Supabase endpoints inlined before
  serving it with `next start`.
