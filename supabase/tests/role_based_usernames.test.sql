begin;

create extension if not exists pgtap;

select plan(16);

-- ============================================================================
-- Setup: two organizations, one platform admin, one org admin, one member
-- ============================================================================
insert into public.organizations (id, name, code, slug, status, timezone) values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Org A', 'ORGA', 'org-a', 'active', 'Asia/Manila'),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'Org B', 'ORGB', 'org-b', 'active', 'Asia/Manila');

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
select * from (values
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'platform@example.com'::text, 'x'::text, now(), now(), now()),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'orgadmin@example.com'::text, 'x'::text, now(), now(), now()),
  ('c0000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'member@example.com'::text, 'x'::text, now(), now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (id, username, first_name, last_name, email, role, status, platform_role) values
  ('c0000000-0000-0000-0000-000000000001', 'platform', 'Platform', 'Admin', 'platform@example.com', 'person', 'active', 'platform_admin'),
  ('c0000000-0000-0000-0000-000000000002', 'orgadmin', 'Org', 'Admin', 'orgadmin@example.com', 'person', 'active', 'user'),
  ('c0000000-0000-0000-0000-000000000003', 'member', 'Plain', 'Member', 'member@example.com', 'person', 'active', 'user');

insert into public.organization_memberships (organization_id, user_id, username, role, status) values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'orgadmin', 'organization_admin', 'active'),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'member', 'member', 'active');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', true); -- platform admin

-- ============================================================================
-- ADMIN format (no padding)
-- ============================================================================
select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin')),
  'ORGA_admin_1',
  'first admin username is ORG_admin_1'
);

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin')),
  'ORGA_admin_2',
  'second admin username is ORG_admin_2'
);

insert into public.organization_membership_username_counters (organization_id, counter_type, last_sequence, updated_at)
values ('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin', 9998, now())
on conflict (organization_id, counter_type)
do update set last_sequence = excluded.last_sequence, updated_at = now();

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin')),
  'ORGA_admin_9999',
  'admin sequence 9999 renders without padding'
);

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin')),
  'ORGA_admin_10000',
  'admin sequence 10000 does not wrap or truncate'
);

-- ============================================================================
-- MEMBER format (minimum 4-digit padding, grows beyond 9999)
-- ============================================================================
select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_0001',
  'first member username is ORG_0001 and admin allocation did not consume it'
);

insert into public.organization_membership_username_counters (organization_id, counter_type, last_sequence, updated_at)
values ('aaaaaaa1-0000-0000-0000-000000000001', 'member', 8, now())
on conflict (organization_id, counter_type)
do update set last_sequence = excluded.last_sequence, updated_at = now();

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_0009',
  'member sequence 9 pads to 0009'
);

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_0010',
  'member sequence 10 pads to 0010'
);

insert into public.organization_membership_username_counters (organization_id, counter_type, last_sequence, updated_at)
values ('aaaaaaa1-0000-0000-0000-000000000001', 'member', 998, now())
on conflict (organization_id, counter_type)
do update set last_sequence = excluded.last_sequence, updated_at = now();

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_0999',
  'member sequence 999 pads to 0999'
);

insert into public.organization_membership_username_counters (organization_id, counter_type, last_sequence, updated_at)
values ('aaaaaaa1-0000-0000-0000-000000000001', 'member', 9998, now())
on conflict (organization_id, counter_type)
do update set last_sequence = excluded.last_sequence, updated_at = now();

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_9999',
  'member sequence 9999 renders as 9999'
);

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_10000',
  'member sequence 10000 does not truncate to 0000'
);

select is(
  (select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member')),
  'ORGA_10001',
  'member sequence 10001 does not wrap'
);

-- ============================================================================
-- Organization isolation: per-organization counters and org-code prefix
-- ============================================================================
select is(
  (select public.generate_membership_username('aaaaaaa2-0000-0000-0000-000000000002', 'member')),
  'ORGB_0001',
  'a second organization starts its member sequence at one with its own code'
);

select is(
  (select public.generate_membership_username('aaaaaaa2-0000-0000-0000-000000000002', 'organization_admin')),
  'ORGB_admin_1',
  'a second organization starts its admin sequence at one with its own code'
);

-- ============================================================================
-- Authorization
-- ============================================================================
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000002', true); -- org admin

select lives_ok(
  $$ select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member'); $$,
  'organization admin can generate a member username'
);

select throws_ok(
  $$ select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'organization_admin'); $$,
  'P0001',
  'Only platform administrators can generate administrator usernames.',
  'organization admin cannot generate an administrator username'
);

select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000003', true); -- plain member

select throws_ok(
  $$ select public.generate_membership_username('aaaaaaa1-0000-0000-0000-000000000001', 'member'); $$,
  'P0001',
  'Only organization administrators can generate usernames.',
  'plain member cannot generate a member username'
);

select * from finish();
rollback;
