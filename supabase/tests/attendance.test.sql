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

insert into public.qr_sessions (
  id,
  token_hash,
  valid_from,
  expires_at,
  status
) values (
  '10000000-0000-0000-0000-000000000001',
  encode(digest('valid-token', 'sha256'), 'hex'),
  now() - interval '10 seconds',
  now() + interval '30 seconds',
  'active'
), (
  '10000000-0000-0000-0000-000000000002',
  encode(digest('expired-token', 'sha256'), 'hex'),
  now() - interval '50 seconds',
  now() - interval '10 seconds',
  'active'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'first scan succeeds'
);

select is(
  (select scan_type::text from public.attendance_scans order by created_at asc limit 1),
  'time_in',
  'first scan stores time_in'
);

select lives_ok(
  $$ select * from public.scan_attendance('valid-token'); $$,
  'second scan succeeds'
);

select is(
  (select scan_type::text from public.attendance_scans order by created_at desc limit 1),
  'time_out',
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
