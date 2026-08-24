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
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- optional `RESEND_FROM_NAME`

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

## Account Email + Recovery

Resend is the transactional email provider for:

- new organization-admin onboarding
- new member onboarding
- existing-user membership notification

Password recovery continues to use Supabase Auth semantics. Production should route
Supabase Auth email through Resend SMTP (or another approved SMTP relay) and allow:

- `https://scppa-portal.vercel.app/reset-password`
- local development reset URLs as needed
- Vercel preview redirect URLs if previews need recovery testing

If Resend or SMTP is unavailable, account provisioning still succeeds, but the admin UI
falls back to an immediate manual email handoff for newly generated temporary passwords.

## Local Development Notes

- `pnpm exec supabase test db` and `pnpm e2e` require the local Supabase stack (Docker).
- The local CLI stack does not grant `service_role` table privileges by default; the
  E2E setup grants them locally. Hosted Supabase grants `service_role` by default, so no
  migration change is needed.
- `pnpm e2e` builds the admin app with the local Supabase endpoints inlined before
  serving it with `next start`.
