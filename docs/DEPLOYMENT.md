# Deployment

## Admin

The admin dashboard is designed for low-cost Next.js hosting. Recommended options:

- Vercel hobby
- Cloudflare-compatible Next.js deployment if server routes are supported

Required server environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `N8N_ONBOARDING_WEBHOOK_URL`
- optional `N8N_ONBOARDING_WEBHOOK_SECRET`

## Mobile

Use Expo for development and internal Android distribution. For V1, APK or internal EAS distribution is sufficient.

Required mobile environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Backend

Provision a Supabase project, run the committed SQL migration, and seed `app_settings`. Then bootstrap the initial admin user using the service role key.

## Onboarding Email

Automated onboarding email is optional.

If you want automation:

1. Create an n8n workflow with a `POST` webhook for person onboarding.
2. Configure a shared secret that matches `N8N_ONBOARDING_WEBHOOK_SECRET`.
3. Connect a Gmail account to the n8n Gmail node.
4. Point `N8N_ONBOARDING_WEBHOOK_URL` to the production webhook URL.

The application only sends onboarding payloads to n8n. It does not send Gmail directly.

If you leave the n8n variables empty, the application remains fully usable and the admin dashboard will provide a manual onboarding email fallback instead.
