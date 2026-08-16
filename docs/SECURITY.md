# Security

## Authentication

Supabase Auth is the only authentication system. Public signup is disabled in local Supabase config. The mobile app uses a trusted username login bridge, while admin authentication continues through Supabase email/password.

## Authorization

Authorization is enforced at multiple layers:

- role and status stored in `profiles`
- RLS policies on all core tables
- admin route checks in the web app
- security-definer database functions for privileged mutations

## Attendance Write Protection

Attendance rows are not intended to be inserted directly from either client. The trusted write path is `scan_attendance(qr_token)`, which validates the QR token, user status, and attendance state before writing.

## QR Strategy

- only hashed tokens are stored
- tokens are short-lived
- old active sessions are expired before validation
- admins can revoke a session manually

## Concurrency

`scan_attendance` uses:

- `unique(user_id, attendance_date)`
- advisory transaction locks keyed by user and Manila date
- row locking on profile, QR session, and attendance record lookups

This prevents duplicate time-ins from near-simultaneous submissions.

## Service Role Handling

The service-role key is only used in server-only admin mutations and the bootstrap script. It must never be exposed to the browser bundle or the Expo app.

## Onboarding Email Webhook

Onboarding email delivery uses a server-only n8n webhook configuration:

- `N8N_ONBOARDING_WEBHOOK_URL`
- `N8N_ONBOARDING_WEBHOOK_SECRET`

The shared secret is attached through the `X-Attendance-Webhook-Secret` header and must never be exposed to browser code, Expo bundles, logs, or admin API responses.

The application does not hold Gmail credentials. Gmail OAuth stays inside n8n, and n8n does not need Supabase service-role access for this onboarding flow.

n8n is optional. If it is not configured, not reachable, or offline, Person creation and credential resets still succeed and return a manual email fallback to the administrator. Plaintext passwords and fallback email bodies must remain in short-lived in-memory response state only.

## Known MVP Limitation

Rotating QR codes reduce screenshot reuse, but they do not prove that the person holding the phone is the real account owner. That stronger identity proof is explicitly out of scope for this MVP.
