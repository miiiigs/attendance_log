# Security

## Authentication

Supabase Auth is the only authentication system. Public signup is disabled locally.

### Organization login (mobile)

Mobile login uses `POST /api/auth/mobile-login` with `organizationCode + username + password`:

1. resolve the organization by normalized code
2. resolve the membership by `(organization_id, username)` with `status = 'active'`
3. resolve the global profile from the membership's user
4. resolve the actual Supabase Auth identity via `auth.admin.getUserById` (never guessed from the organization username)
5. perform a Supabase password grant

Unknown organization/username/password combinations return a single generic error
(`Invalid organization code, username, or password.`) and never reveal whether an
account exists. Distinct operational messages are used only for inactive memberships
and suspended organizations.

### Admin login

Platform and organization admins sign in with username/password through the admin app,
which resolves the username to the derived auth email (`{username}@attendance.local`).

## Authorization

Authorization is enforced at multiple layers:

- global and per-membership roles stored in the database
- RLS policies on all tenant tables
- security-definer authorization helpers (`is_platform_admin`, `is_organization_admin`, `is_organization_member`, `get_own_membership_id`)
- organization-route guards (`requireOrgAdmin`) that resolve the organization from the route slug and verify an active organization-admin membership
- security-definer RPCs for every privileged mutation

Platform admins may enter organization consoles; organization admins never gain platform scope.

## Tenant Isolation

- Organization A can never read or modify Organization B data.
- RLS fails closed; composite foreign keys prevent cross-organization activity/membership/QR relationships structurally.
- No client-supplied organization id, activity id, or membership id is trusted as authority — the QR session, the authenticated user, and server-side membership validation determine tenant.
- Member activity history is limited to logs the member personally participated in.

## Activity Write Protection

Activity logs and scans are never written directly from clients. The trusted path is
`scan_activity(qr_token)`, which validates the QR, organization, activity, membership,
and scan state before writing.

## QR Strategy

- only hashed tokens are stored in the database
- sessions are short-lived (5-hour default for Activity QRs) and can be revoked
- the raw token is returned once at creation and kept in an httpOnly admin cookie for
  display/fullscreen/download; the cookie is cleared on revocation or Activity end
- expired/revoked QR codes fail server-side even if a downloaded copy is rescanned

## Concurrency

`scan_activity` uses advisory transaction locks keyed on `(activity_id, membership_id)`
plus row locks, preventing duplicate Time In/Time Out under near-simultaneous scans.

## Service Role Handling

`SUPABASE_SERVICE_ROLE_KEY` is only used in server-only admin code (login bridge, people
onboarding, platform approval) and scripts. It must never appear in browser bundles or
the Expo app. In the local Supabase CLI stack, `service_role` lacks table grants by
default; the E2E setup grants them locally (this does not affect hosted projects, where
`service_role` is privileged by default).

## Onboarding Email Webhook

Automated onboarding email is optional and server-only:

- `N8N_ONBOARDING_WEBHOOK_URL` + `N8N_ONBOARDING_WEBHOOK_SECRET` (shared via the `X-Attendance-Webhook-Secret` header)
- empty = manual email fallback returned to the administrator
- plaintext temporary passwords remain in short-lived in-memory responses only

## Known Limitation

Rotating QR codes reduce screenshot reuse but do not prove the person holding the phone
is the real account owner. Stronger identity proof is out of scope.
