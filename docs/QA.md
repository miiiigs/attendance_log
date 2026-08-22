# QA Checklist

Automated checks run against local Supabase (Docker). Start it first: `pnpm supabase:start`.

## Automated

1. `pnpm lint` — eslint (admin) + tsc (shared)
2. `pnpm typecheck`
3. `pnpm test` — vitest (shared + admin)
4. `pnpm build` — Next admin production build
5. `pnpm exec supabase test db` — pgTAP (36 assertions across attendance + activity foundation)
6. `pnpm e2e` — Playwright browser smoke against local Supabase (seeds local test identities, builds the admin app with local endpoints, then exercises: platform application -> platform approval -> organization suspend/reactivate plus the existing org admin Activity lifecycle)
7. `pnpm e2e:install` — install the Playwright chromium browser once

## Manual Organization Console

1. Log in as an organization admin (default `user` / `password`).
2. Confirm you land on `/org/scppa/dashboard`.
3. Start an Activity, confirm the QR renders with a 5-hour expiry.
4. Open the QR fullscreen and download the PNG.
5. Remove the QR and confirm the Activity stays active; regenerate a replacement.
6. Confirm the member table shows Not Logged members (not just those who scanned).
7. End the Activity and confirm history is preserved without fabricated time-outs.
8. Confirm `/attendance`, `/qr`, `/employees` redirect to the organization console.

## Manual Mobile

1. Sign in with organization code `SCPPA`, a member username, and its password.
2. Confirm the home screen shows the organization and current Activity.
3. Scan the Activity QR once (Time In), then again (Time Out).
4. Confirm a third scan is rejected.
5. Confirm My Activities shows only the activities the member joined.
6. Test expired/invalid QR handling.
7. Test wrong-password and wrong-organization login errors.

## Tenant Isolation

1. As an Org A admin, confirm Org B routes are denied.
2. As an Org A member, confirm an Org B QR scan is rejected ("QR code does not belong to your organization.").

## Manual Platform Admin

1. Open `/apply` and submit an organization request.
2. Sign in as a platform admin and confirm the request appears under `/admin/applications`.
3. Approve the request and confirm the success state shows the organization code, username, and either a temporary password or existing-account reuse notice.
4. If automated email is unavailable, confirm Copy Subject and Copy Email Body are available.
5. Confirm the new organization appears under `/admin/organizations`.
6. Suspend the organization, verify the status changes to suspended, then reactivate it.

## Cleanup

- The E2E seeds deterministic local identities (e2e.admin, 202699001, 202700001, Org `E2EB`).
  Re-running `pnpm e2e` (or `pnpm e2e:seed`) resets them. They never touch hosted projects.
