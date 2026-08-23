begin;

create extension if not exists pgtap;

select plan(25);

insert into public.organizations (id, name, code, slug, status, timezone) values
  ('bbbbbbb1-0000-0000-0000-000000000001', 'Security Org', 'SECA', 'security-org', 'active', 'Asia/Manila')
on conflict (id) do nothing;

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
  ('10000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'security-admin@example.com'::text, 'x'::text, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'security-member@example.com'::text, 'x'::text, now(), now(), now())
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
  ('10000000-0000-0000-0000-000000000001', 'secadmin', 'Security', 'Admin', 'security-admin@example.com', 'person', 'active', 'platform_admin'),
  ('10000000-0000-0000-0000-000000000002', 'secmember', 'Security', 'Member', 'security-member@example.com', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status
) values
  ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '260000001', 'organization_admin', 'active'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '260000002', 'member', 'active')
on conflict (organization_id, user_id) do nothing;

select ok(
  exists(
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'organization_username_counters'
      and c.relrowsecurity
  ),
  'organization_username_counters has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.organization_username_counters', 'select'),
  'anon cannot select organization_username_counters'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_username_counters', 'select'),
  'authenticated cannot select organization_username_counters'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_username_counters', 'insert'),
  'authenticated cannot insert organization_username_counters'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_username_counters', 'update'),
  'authenticated cannot update organization_username_counters'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_username_counters', 'delete'),
  'authenticated cannot delete organization_username_counters'
);

select ok(
  has_table_privilege('authenticated', 'public.activities', 'select'),
  'authenticated retains read access to activities'
);

select ok(
  not has_table_privilege('authenticated', 'public.activities', 'insert'),
  'authenticated no longer has direct insert access to activities'
);

select ok(
  not has_table_privilege('authenticated', 'public.activities', 'update'),
  'authenticated no longer has direct update access to activities'
);

select ok(
  has_table_privilege('authenticated', 'public.activity_logs', 'select'),
  'authenticated retains read access to activity_logs'
);

select ok(
  not has_table_privilege('authenticated', 'public.activity_scans', 'select'),
  'authenticated has no direct read access to activity_scans'
);

select ok(
  has_table_privilege('authenticated', 'public.qr_sessions', 'select'),
  'authenticated retains read access to qr_sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.qr_sessions', 'insert'),
  'authenticated has no direct insert access to qr_sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.qr_sessions', 'update'),
  'authenticated has no direct update access to qr_sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.qr_sessions', 'delete'),
  'authenticated has no direct delete access to qr_sessions'
);

select ok(
  not has_function_privilege('anon', 'public.create_activity(text)', 'execute'),
  'anon cannot execute create_activity'
);

select ok(
  not has_function_privilege('anon', 'public.scan_activity(text)', 'execute'),
  'anon cannot execute scan_activity'
);

select ok(
  not has_function_privilege('anon', 'public.generate_next_membership_username(uuid, integer)', 'execute'),
  'anon cannot execute generate_next_membership_username'
);

select ok(
  not has_function_privilege('authenticated', 'public.expire_old_qr_sessions()', 'execute'),
  'authenticated cannot execute expire_old_qr_sessions directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.get_default_organization_id(uuid)', 'execute'),
  'authenticated cannot execute get_default_organization_id directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.generate_next_username(integer)', 'execute'),
  'authenticated cannot execute generate_next_username directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  'authenticated cannot execute legacy is_admin directly'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select public.generate_next_membership_username('bbbbbbb1-0000-0000-0000-000000000001'); $$,
  'authorized admin can still generate the next membership username'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$ select public.generate_next_membership_username('bbbbbbb1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'Only organization administrators can generate usernames.',
  'plain member still cannot generate membership usernames'
);

select * from finish();
rollback;
