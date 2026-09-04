# QRLog Account Deletion Runbook

This operator runbook covers request-based QRLog account deletion. A completed deletion request must end with the requester's permanent QRLog Auth account deleted. Do not start by calling `auth.admin.deleteUser()`: `profiles.id` references `auth.users` with `ON DELETE RESTRICT`, and participation/audit tables also intentionally restrict deletion.

## Data Contract Audit

| Table or identity | User-linked fields | Current FK/delete behavior | Classification | Processing notes |
| --- | --- | --- | --- | --- |
| `auth.users` | `id`, `email`, provider identity | Referenced by `profiles.id` with `ON DELETE RESTRICT` | DELETE | Delete only after dependent profile-linked data has been handled. |
| `profiles` | `id`, `username`, `first_name`, `last_name`, `display_name`, `email`, status/roles | References `auth.users` with `ON DELETE RESTRICT` | DELETE | Delete the original profile before deleting the permanent Auth account. Retaining an anonymized profile that remains linked to the same `auth.users` row is not completed account deletion. |
| `organization_memberships` | `user_id`, `username`, `display_name`, role/status | `user_id` references `profiles(id)` with `ON DELETE CASCADE`; activity logs/scans also reference memberships structurally | DELETE or SEVER | Delete memberships after restrictive activity references are handled; retained facts must not preserve a live membership/profile/Auth linkage. |
| `activities.created_by` | `created_by` | References `profiles(id)` with `ON DELETE SET NULL` | ANONYMIZE | Set to null or rely on FK after profile removal; do not delete activities solely because the requester created them. |
| `qr_sessions.created_by` | `created_by` | References `profiles(id)` with `ON DELETE SET NULL`; sessions store hashed QR tokens | ANONYMIZE/RETAIN | Set creator to null where needed; retain operational QR session state for audit/security. |
| `activity_logs` | `user_id`, `membership_id`, Time In/Time Out | `user_id` references `profiles(id)` with `ON DELETE RESTRICT`; composite membership/activity integrity FKs | DELETE or RETAIN OUTSIDE DIRECT ACCOUNT LINKAGE | Delete when no retention requirement applies. If facts must be retained, de-identify and sever them from the original live profile/Auth identity before deleting the linked rows, or escalate if the current schema cannot safely support that. |
| `activity_scans` | `user_id`, `membership_id`, scan timestamps/types, QR session link | `user_id` references `profiles(id)` with `ON DELETE RESTRICT` | DELETE or RETAIN OUTSIDE DIRECT ACCOUNT LINKAGE | Delete when no retention requirement applies. If audit facts must be retained, de-identify and sever them from the original live profile/Auth identity before deleting the linked rows, or escalate if the current schema cannot safely support that. |
| `attendance_records` | `user_id`, attendance date, Time In/Time Out | `user_id` references `profiles(id)` with `ON DELETE RESTRICT` | DELETE or RETAIN OUTSIDE DIRECT ACCOUNT LINKAGE | Delete when no retention requirement applies. If legacy facts must be retained, de-identify and sever them from the original live profile/Auth identity before deleting the linked rows, or escalate if the current schema cannot safely support that. |
| `attendance_scans` | `user_id`, attendance record, scan timestamps/types, QR session link | `user_id` references `profiles(id)` with `ON DELETE RESTRICT` | DELETE or RETAIN OUTSIDE DIRECT ACCOUNT LINKAGE | Delete when no retention requirement applies. If legacy audit facts must be retained, de-identify and sever them from the original live profile/Auth identity before deleting the linked rows, or escalate if the current schema cannot safely support that. |
| `organization_join_authorizations` | `normalized_email`, `created_by`, `claimed_by` | Organization FK cascades; `created_by`/`claimed_by` use `ON DELETE SET NULL` | DELETE or ANONYMIZE | Delete or clear requester's email authorizations. Creator/claimer links can be set null. |
| `organization_applications` | `contact_first_name`, `contact_last_name`, `contact_email`, `reviewed_by` | `reviewed_by` references `profiles(id)` with `ON DELETE SET NULL` | NOT ACCOUNT-LINKED or ANONYMIZE | Application contact data is not directly account-linked unless it overlaps the requester; redact contact fields when verified as the same person and no retention need applies. |
| `organizations.approved_by` | `approved_by` | References `profiles(id)` with `ON DELETE SET NULL` | ANONYMIZE | Clear approver link if tied to the requester. |

## Request Intake

Locate pending or verified requests:

```sql
select *
from public.account_deletion_requests
where status in ('pending', 'verified')
order by requested_at asc;
```

## Deletion Processing Order

1. Verify account ownership safely. Use an out-of-band verification method appropriate for the account, such as contacting the verified Auth email. Do not reveal whether an email belongs to an account until the requester has proven control of that email.

2. Identify the corresponding Auth user after verification:

   ```sql
   select id, email, is_anonymous, created_at, last_sign_in_at
   from auth.users
   where lower(btrim(email)) = lower(btrim('<verified-email>'));
   ```

3. Inventory user-linked data before changing anything:

   ```sql
   select count(*) from public.profiles where id = '<user-id>';
   select count(*) from public.organization_memberships where user_id = '<user-id>';
   select count(*) from public.activities where created_by = '<user-id>';
   select count(*) from public.qr_sessions where created_by = '<user-id>';
   select count(*) from public.activity_logs where user_id = '<user-id>';
   select count(*) from public.activity_scans where user_id = '<user-id>';
   select count(*) from public.attendance_records where user_id = '<user-id>';
   select count(*) from public.attendance_scans where user_id = '<user-id>';
   select count(*) from public.organization_join_authorizations where normalized_email = lower(btrim('<verified-email>')) or created_by = '<user-id>' or claimed_by = '<user-id>';
   select count(*) from public.organization_applications where lower(btrim(contact_email)) = lower(btrim('<verified-email>')) or reviewed_by = '<user-id>';
   ```

4. Determine which data must be deleted versus legitimately retained. Community participation, attendance, scan, security, legal, fraud-prevention, and organizational-recordkeeping records may require retention. Do not guess legal retention requirements; escalate when unclear.

5. Delete or safely de-identify and sever restrictive linked records. For restrictive user-linked activity or attendance records, choose one path:

   - Path A, delete: delete `activity_logs`, `activity_scans`, `attendance_records`, and `attendance_scans` linked to the requester when there is no legitimate retention requirement.
   - Path B, legitimate retention: remove unnecessary personal identifiers and sever retained operational/audit facts from the requester's live QRLog account/profile identity before deleting the original linked rows. The retained facts must not remain linked to the original profile/Auth account in a way that prevents account deletion. If the current schema cannot safely de-link retained information, do not mark the request completed; escalate the retention case instead of preserving a live app account merely to retain audit records.

6. Remove memberships and remaining personal identifiers. At minimum, handle `organization_memberships`, profile names, profile email, membership display names/usernames, join authorization email records, application contact fields, and nullable creator/reviewer/approver references that identify the requester.

   Handle restrictive dependencies in this order:

   - Decide retention for `activity_logs`, `activity_scans`, `attendance_records`, and `attendance_scans`.
   - Delete linked records that no longer need retention.
   - For retained facts, de-identify and sever them from the original profile/Auth identity before deleting the original linked rows. Retaining rows in place while they still point at the requester's profile is not account deletion.
   - Remove `organization_memberships` once activity scan/log dependencies are cleared or severed.
   - Clear nullable references such as `activities.created_by`, `qr_sessions.created_by`, `organizations.approved_by`, `organization_applications.reviewed_by`, and `organization_join_authorizations.created_by/claimed_by`.
   - Delete or redact `organization_join_authorizations` and overlapping `organization_applications` data.

7. Delete the `profiles` row only after restrictive references have been handled. Retaining an anonymized profile linked to the same `auth.users` row is not completed account deletion.

8. Delete the permanent `auth.users` account. This is mandatory before a deletion request can be completed.

9. Verify the user can no longer authenticate. Confirm Auth no longer has an active permanent user for the verified email, and confirm mobile/admin login with that account fails. Do not test with the Google Play reviewer account or SCPPA data.

10. Mark the request completed only after authentication failure is verified:

   ```sql
   update public.account_deletion_requests
   set status = 'completed',
       processed_at = now()
   where id = '<request-id>';
   ```

## Follow-Up Automation Work

Safe automatic destructive deletion would require a larger retention-aware schema and product decision. Until that exists, QRLog supports a working public and in-app request pathway with manual operator verification and dependency-aware processing.
