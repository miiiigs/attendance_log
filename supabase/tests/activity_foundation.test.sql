begin;

create extension if not exists pgtap;

select plan(27);

-- ============================================================================
-- Setup: three organizations, seven people, five memberships
-- ============================================================================
insert into public.organizations (id, name, code, slug, status, timezone) values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Org A', 'ORGA', 'org-a', 'active', 'Asia/Manila'),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'Org B', 'ORGB', 'org-b', 'active', 'Asia/Manila'),
  ('aaaaaaa3-0000-0000-0000-000000000003', 'Org Suspended', 'ORGS', 'org-s', 'suspended', 'Asia/Manila');

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
  ('00000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'admina@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'membera@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'memberb@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, 'adminb@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'admins@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000007'::uuid, 'authenticated'::text, 'authenticated'::text, 'user007@example.com'::text, 'x'::text, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000008'::uuid, 'authenticated'::text, 'authenticated'::text, 'user008@example.com'::text, 'x'::text, now(), now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (
  id,
  username,
  first_name,
  last_name,
  email,
  role,
  status,
  platform_role
) values
  ('00000000-0000-0000-0000-000000000001', 'admina', 'Admin', 'A', 'admina@example.com', 'person', 'active', 'platform_admin'),
  ('00000000-0000-0000-0000-000000000002', 'membera', 'Member', 'A', 'membera@example.com', 'person', 'active', 'user'),
  ('00000000-0000-0000-0000-000000000003', 'memberb', 'Member', 'B', 'memberb@example.com', 'person', 'active', 'user'),
  ('00000000-0000-0000-0000-000000000004', 'adminb', 'Admin', 'B', 'adminb@example.com', 'person', 'active', 'user'),
  ('00000000-0000-0000-0000-000000000005', 'admins', 'Admin', 'S', 'admins@example.com', 'person', 'active', 'user'),
  ('00000000-0000-0000-0000-000000000007', 'user007', 'User', 'Seven', 'user007@example.com', 'person', 'active', 'user'),
  ('00000000-0000-0000-0000-000000000008', 'user008', 'User', 'Eight', 'user008@example.com', 'person', 'active', 'user');

insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status
) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admina', 'organization_admin', 'active'),
  ('aaaaaaa1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'membera', 'member', 'active'),
  ('aaaaaaa2-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'adminb', 'organization_admin', 'active'),
  ('aaaaaaa2-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'memberb', 'member', 'active'),
  ('aaaaaaa3-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'admins', 'organization_admin', 'active');

select set_config('request.jwt.claim.role', 'authenticated', true);

-- ============================================================================
-- Activities: creation, one-active-per-org, cross-org independence
-- ============================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true); -- adminA

select lives_ok(
  $$ select * from public.create_activity('Morning Seminar'); $$,
  'org admin can create an activity'
);

select throws_ok(
  $$ select * from public.create_activity('Another Seminar'); $$,
  'P0001',
  'An active activity already exists for this organization.',
  'second active activity in the same organization is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true); -- memberB

select throws_ok(
  $$ select * from public.create_activity('Sneaky Activity'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'plain member cannot create an activity'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true); -- adminB

select lives_ok(
  $$ select * from public.create_activity('Evening Meeting'); $$,
  'a different organization may have its own active activity simultaneously'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true); -- adminS (suspended org)

select throws_ok(
  $$ select * from public.create_activity('Doomed Activity'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'suspended organization rejects activity creation (admins lose org_admin scope)'
);

-- ============================================================================
-- Activity QR lifecycle (tokens captured via psql \gset)
-- ============================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true); -- adminA

select id as activity_a_id
from public.activities
where organization_id = 'aaaaaaa1-0000-0000-0000-000000000001'
limit 1 \gset

select token as qr_token_a
from public.create_activity_qr_session(:'activity_a_id', 3600) \gset

select lives_ok(
  format('select * from public.create_activity_qr_session(%L, 3600);', :'activity_a_id'),
  'a replacement QR can be generated for the same activity'
);

select token as qr_token_a2
from public.create_activity_qr_session(:'activity_a_id', 3600) \gset

-- The original token was revoked by the replacement.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true); -- memberA

select throws_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a'),
  'P0001',
  'QR code has expired.',
  'revoked replacement QR is rejected'
);

select lives_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a2'),
  'first activity scan succeeds (time in)'
);

select is(
  (select count(*)::integer from public.activity_scans where scan_type = 'time_in'),
  1,
  'first scan stores time_in'
);

select lives_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a2'),
  'second activity scan succeeds (time out)'
);

select is(
  (select count(*)::integer from public.activity_scans where scan_type = 'time_out'),
  1,
  'second scan stores time_out'
);

select throws_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a2'),
  'P0001',
  'Activity already completed.',
  'third scan is rejected'
);

-- Cross-tenant scan must fail closed.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true); -- memberB

select throws_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a2'),
  'P0001',
  'QR code does not belong to your organization.',
  'member of another organization cannot scan this QR'
);

-- ============================================================================
-- Ending an activity revokes its QRs and stops further scans
-- ============================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true); -- adminA

select lives_ok(
  format('select * from public.end_activity(%L);', :'activity_a_id'),
  'admin can end an activity'
);

-- Craft an active QR still pointing at the ended activity to prove the guard.
insert into public.qr_sessions (
  token_hash,
  valid_from,
  expires_at,
  status,
  created_by,
  organization_id,
  activity_id
) values (
  encode(digest('ended-activity-token', 'sha256'), 'hex'),
  now() - interval '1 minute',
  now() + interval '1 hour',
  'active',
  '00000000-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000001',
  :'activity_a_id'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true); -- memberA

select throws_ok(
  $$ select * from public.scan_activity('ended-activity-token'); $$,
  'P0001',
  'Activity has ended.',
  'scan against an ended activity is rejected'
);

-- ============================================================================
-- A member may participate in multiple activities on the same calendar date
-- ============================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true); -- adminA

select lives_ok(
  $$ select * from public.create_activity('Evening Activity'); $$,
  'a new active activity can start after the previous one ended'
);

select id as activity_a2_id
from public.activities
where organization_id = 'aaaaaaa1-0000-0000-0000-000000000001'
  and status = 'active'
  and id <> :'activity_a_id'
limit 1 \gset

select token as qr_token_a2b
from public.create_activity_qr_session(:'activity_a2_id', 3600) \gset

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true); -- memberA

select lives_ok(
  format('select * from public.scan_activity(%L);', :'qr_token_a2b'),
  'member can time in to a second activity on the same date'
);

select is(
  (select count(*)::integer
   from public.activity_logs
   where membership_id = (select id from public.organization_memberships
                          where user_id = '00000000-0000-0000-0000-000000000002'
                            and organization_id = 'aaaaaaa1-0000-0000-0000-000000000001')),
  2,
  'two activity logs for the same member on the same date are allowed'
);

-- ============================================================================
-- Organization-scoped username generation
-- ============================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true); -- adminA (platform admin)

select generate_next_membership_username('aaaaaaa1-0000-0000-0000-000000000001') as username_a1 \gset
select generate_next_membership_username('aaaaaaa1-0000-0000-0000-000000000001') as username_a2 \gset

select ok(
  :'username_a1' <> :'username_a2',
  'consecutive usernames within one organization are unique'
);

select generate_next_membership_username('aaaaaaa2-0000-0000-0000-000000000002') as username_b1 \gset

select is(
  :'username_a1'::text,
  :'username_b1'::text,
  'different organizations may generate the same username'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true); -- memberA

select throws_ok(
  $$ select * from public.generate_next_membership_username('aaaaaaa1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'Only organization administrators can generate usernames.',
  'plain member cannot generate organization usernames'
);

-- Duplicate (organization_id, username) is impossible at the DB level.
insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status
) values (
  'aaaaaaa1-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007',
  :'username_a1',
  'member',
  'active'
);

select throws_ok(
  format(
    'insert into public.organization_memberships (organization_id, user_id, username, role, status) values (%L, %L, %L, %L, %L);',
    'aaaaaaa1-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000008',
    :'username_a1',
    'member',
    'active'
  ),
  '23505',
  NULL,
  'duplicate username inside the same organization is rejected'
);

-- ============================================================================
-- RLS tenant isolation (queries run as authenticated; counts captured via \gset)
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true); -- memberA
select count(*)::integer as cnt_member_rows from public.organization_memberships \gset
select count(*)::integer as cnt_member_orgb_activities
from public.activities
where organization_id = 'aaaaaaa2-0000-0000-0000-000000000002' \gset
select count(*)::integer as cnt_member_logs from public.activity_logs \gset
reset role;

select is(:cnt_member_rows, 1, 'member can only see their own membership');
select is(:cnt_member_orgb_activities, 0, 'member cannot see another organization activities');
select is(:cnt_member_logs, 2, 'member can only see their own activity logs');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true); -- adminB
select count(*)::integer as cnt_adminb_memberships from public.organization_memberships \gset
select count(*)::integer as cnt_adminb_orga_activities
from public.activities
where organization_id = 'aaaaaaa1-0000-0000-0000-000000000001' \gset
reset role;

select is(:cnt_adminb_memberships, 2, 'org admin can see their own organization memberships');
select is(:cnt_adminb_orga_activities, 0, 'org admin cannot see another organization activities');

select * from finish();
rollback;
