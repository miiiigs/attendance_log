# n8n Onboarding Email (Legacy)

This document describes the pre-Resend onboarding workflow that existed before the
focused V1 account release on August 24, 2026. The current onboarding and membership
email path uses direct server-side Resend delivery instead of the n8n webhook described
below.

## Purpose

This workflow sends transactional onboarding credentials for newly created People and later credential resets.

n8n is optional. The application is designed to work without it.

The application:

- generates the username
- generates the temporary password
- creates the Supabase Auth user
- creates the Person profile
- always generates the onboarding subject and body
- optionally posts onboarding data to n8n

n8n:

- validates the secret
- validates the payload
- formats the email
- sends it through Gmail

## Optional App Environment Variables

```env
N8N_ONBOARDING_WEBHOOK_URL=https://example-n8n-host.com/webhook/person-onboarding
N8N_ONBOARDING_WEBHOOK_SECRET=long-random-private-secret
```

Leave both values empty if automated onboarding email is not available. The admin dashboard will still provide manual copy-and-send fallback content.

## Recommended Workflow

```text
Webhook
  ↓
Validate Secret
  ↓
Validate Required Fields
  ↓
Format Email
  ↓
Gmail Send Message
  ↓
Respond to Webhook
```

## Webhook Node

- Method: `POST`
- Path: `person-onboarding`
- Response mode: `Using Respond to Webhook node`

The webhook can be self-hosted on a PC, office server, NAS, mini-PC, or any machine the client controls. n8n Cloud is not required.

## Secret Validation

The application sends:

```http
X-Attendance-Webhook-Secret: <N8N_ONBOARDING_WEBHOOK_SECRET>
```

In n8n, compare that header with your configured secret before sending any email.

If the secret does not match:

- return `401` or `403`
- do not proceed to Gmail

Do not hardcode secrets into a publicly shared exported workflow if you can avoid it. Store them in n8n credentials, variables, or protected configuration.

## Payload Validation

Require these fields:

- `email`
- `firstName`
- `username`
- `temporaryPassword`

Optional fields:

- `lastName`
- `fullName`
- `organizationName`

If required fields are missing:

- return `400`
- do not send email

## Example Request Payload

```json
{
  "event": "person.created",
  "to": "juan@example.com",
  "subject": "Your Example Company Attendance Account",
  "textBody": "Hello Juan...",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "fullName": "Juan Dela Cruz",
  "email": "juan@example.com",
  "username": "202600001",
  "temporaryPassword": "G7kP2mQ9xL4A",
  "organizationName": "Example Company"
}
```

## Gmail Node

Use the official n8n Gmail node with Gmail OAuth.

The application must not store Gmail passwords or send Gmail directly.

## Suggested Subject

```text
Your Attendance Account
```

## Suggested Body

```text
Hello Juan,

Your attendance account has been created.

Username:
202600001

Temporary Password:
G7kP2mQ9xL4A

Use these credentials to sign in to the Attendance mobile application.

Please keep your login credentials private and do not share them with anyone.

If you have trouble accessing your account, contact your administrator.

Example Company
```

## Response Contract

Success:

```json
{
  "success": true
}
```

Failure:

```json
{
  "success": false,
  "message": "Unable to send onboarding email"
}
```

Recommended statuses:

- `200` for success
- `400` for invalid payload
- `401` or `403` for bad secret
- `500` for workflow or Gmail failure

## Networking Note

If the Next.js backend is deployed publicly but your self-hosted n8n instance only exists on a private LAN address such as `http://192.168.1.20:5678`, the hosted backend usually cannot reach it directly.

In that case the application should simply fall back to manual onboarding email handling unless you intentionally expose the webhook through a secure reachable endpoint, tunnel, VPN, or reverse proxy.
