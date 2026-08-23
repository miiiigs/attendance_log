begin;

create extension if not exists pgtap;

select plan(9);

insert into public.app_settings (
  organization_name,
  timezone,
  work_start_time,
  work_end_time,
  grace_period_minutes
) values (
  'Attendance Logger',
  'Asia/Manila',
  '08:00',
  '17:00',
  10
)
on conflict do nothing;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
select * from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'juan@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'ana@example.com'::text, 'x'::text, now(), now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (
  id,
  username,
  first_name,
  last_name,
  email,
  role,
  status
) values
  ('00000000-0000-0000-0000-000000000001', 'juan', 'Juan', 'Dela Cruz', 'juan@example.com', 'person', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'ana', 'Ana', 'Reyes', 'ana@example.com', 'person', 'inactive');

-- The multitenant foundation seeds the SCPPA organization from app_settings.
-- Bind the test people to it as active members (required by the org-scoped
-- legacy scan flow), and scope the QR sessions to the same organization.
insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status
)
select
  o.id,
  p.id,
  p.username,
  'member'::public.organization_membership_role,
  'active'::public.account_status
from public.organizations o
cross join public.profiles p
where lower(o.code) = 'scppa'
  and p.username in ('juan', 'ana')
on conflict (organization_id, user_id) do nothing;

insert into public.qr_sessions (
  id,
  token_hash,
  valid_from,
  expires_at,
  status,
  organization_id
)
select
  '10000000-0000-0000-0000-000000000001',
  encode(digest('valid-token', 'sha256'), 'hex'),
  now() - interval '10 seconds',
  now() + interval '30 seconds',
  'active',
  o.id
from public.organizations o
where lower(o.code) = 'scppa';

insert into public.qr_sessions (
  id,
  token_hash,
  valid_from,
  expires_at,
  status,
  organization_id
)
select
  '10000000-0000-0000-0000-000000000002',
  encode(digest('expired-token', 'sha256'), 'hex'),
  now() - interval '50 seconds',
  now() - interval '10 seconds',
  'active',
  o.id
from public.organizations o
where lower(o.code) = 'scppa';

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'first scan succeeds'
);

select is(
  (select count(*)::integer from public.attendance_scans where scan_type = 'time_in'),
  1,
  'first scan stores time_in'
);

select lives_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'second scan succeeds'
);

select is(
  (select count(*)::integer from public.attendance_scans where scan_type = 'time_out'),
  1,
  'second scan stores time_out'
);

select throws_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'P0001',
  'Attendance already completed for today.',
  'third scan is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'P0001',
  'Your account is inactive.',
  'inactive person is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

delete from public.attendance_scans;
delete from public.attendance_records;

select throws_ok(
  $$ select * from public.scan_attendance('expired-token'); $$,
  'P0001',
  'QR code has expired.',
  'expired token is rejected'
);

select throws_ok(
  $$ select * from public.scan_attendance(''); $$,
  'P0001',
  'Invalid attendance QR.',
  'blank token is rejected'
);

select is(
  (select count(*)::integer from public.attendance_records),
  0,
  'rejected scans do not create attendance records'
);

select * from finish();
rollback;
