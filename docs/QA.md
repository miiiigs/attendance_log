# QA Checklist

1. Run `pnpm install`.
2. Start Supabase with `pnpm supabase:start`.
3. Apply migrations or reset the database with `pnpm supabase:reset`.
4. Set environment variables from `.env.example`.
5. Bootstrap the first admin with `pnpm bootstrap:admin`.
6. Start the admin app with `pnpm dev:admin`.
7. Start the mobile app with `pnpm dev:mobile`.
8. Log in as admin.
9. Create a person.
10. Log in on mobile as that person.
11. Open the admin QR page.
12. Scan the QR once and verify time in.
13. Scan another fresh QR and verify time out.
14. Attempt a third scan and verify rejection.
15. Open mobile history and verify the record appears.
16. Open the admin attendance page and verify the row appears.
17. Deactivate the person and verify further scans fail.
18. Test expired QR handling by waiting past the countdown.
19. Test invalid QR handling with a malformed payload.
20. Test wrong-password login handling in both apps.
