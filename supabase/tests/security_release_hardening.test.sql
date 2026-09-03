begin;

create extension if not exists pgtap;

select plan(39);

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
  ('10000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'security-member@example.com'::text, 'x'::text, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'security-orgadmin@example.com'::text, 'x'::text, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, 'security-newmember@example.com'::text, 'x'::text, now(), now(), now())
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
  ('10000000-0000-0000-0000-000000000002', 'secmember', 'Security', 'Member', 'security-member@example.com', 'person', 'active', 'user'),
  ('10000000-0000-0000-0000-000000000003', 'secorgadmin', 'Security', 'Org Admin', 'security-orgadmin@example.com', 'person', 'active', 'user'),
  ('10000000-0000-0000-0000-000000000004', 'secnewmember', 'Security', 'New Member', 'security-newmember@example.com', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status
) values
  ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '260000001', 'organization_admin', 'active'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '260000002', 'member', 'active'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'SECA_admin_1', 'organization_admin', 'active')
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
  not has_function_privilege('anon', 'public.create_activity(text, uuid, public.activity_visibility)', 'execute'),
  'anon cannot execute create_activity'
);

select ok(
  not has_function_privilege('anon', 'public.scan_activity(text)', 'execute'),
  'anon cannot execute scan_activity'
);

select ok(
  not has_function_privilege('anon', 'public.leave_activity(uuid)', 'execute'),
  'anon cannot execute leave_activity'
);

select ok(
  not has_function_privilege('anon', 'public.generate_membership_username(uuid, public.organization_membership_role)', 'execute'),
  'anon cannot execute generate_membership_username'
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
  has_function_privilege('authenticated', 'public.generate_membership_username(uuid, public.organization_membership_role)', 'execute'),
  'authenticated can execute generate_membership_username'
);

select ok(
  not has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  'authenticated cannot execute legacy is_admin directly'
);

select ok(
  has_function_privilege('authenticated', 'public.leave_activity(uuid)', 'execute'),
  'authenticated can execute leave_activity'
);

select ok(
  exists(
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activities'
  ),
  'activities is published to supabase_realtime'
);

select ok(
  exists(
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_logs'
  ),
  'activity_logs is published to supabase_realtime'
);

select ok(
  exists(
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organization_memberships'
  ),
  'organization_memberships is published to supabase_realtime'
);

select ok(
  exists(
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ),
  'profiles is published to supabase_realtime'
);

select ok(
  exists(
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'qr_sessions'
  ),
  'qr_sessions is published to supabase_realtime'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select public.generate_membership_username('bbbbbbb1-0000-0000-0000-000000000001', 'member'); $$,
  'authorized admin can still generate the next membership username'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$ select public.generate_membership_username('bbbbbbb1-0000-0000-0000-000000000001', 'member'); $$,
  'P0001',
  'Only organization administrators can generate usernames.',
  'plain member still cannot generate membership usernames'
);

-- ---------------------------------------------------------------------------
-- Release audit regression coverage
-- ---------------------------------------------------------------------------

-- Switch to the real API role so RLS (not just grants) is exercised.
set role authenticated;

-- An authenticated client can never modify the role columns on profiles.
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'platform_role', 'update'),
  'authenticated cannot update profiles.platform_role'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'update'),
  'authenticated cannot update profiles.role'
);

-- Use a non-platform organization admin (0003) for the membership/activity RLS
-- checks so they prove tenant-admin behavior, not platform-admin behavior.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

-- Organization admins cannot fabricate administrator memberships directly.
select throws_ok(
  $$ insert into public.organization_memberships (organization_id, user_id, username, role, status)
     values ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'FABRICATED_admin_99', 'organization_admin', 'active'); $$,
  '42501',
  NULL,
  'organization admin cannot insert an organization_admin membership'
);

-- Organization admins can still create member memberships in their own org.
select lives_ok(
  $$ insert into public.organization_memberships (organization_id, user_id, username, role, status)
     values ('bbbbbbb1-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'SECA_0001', 'member', 'active'); $$,
  'organization admin can still insert a member membership'
);

-- An organization admin cannot update an existing membership to an admin role.
select throws_ok(
  $$ update public.organization_memberships
     set role = 'organization_admin'
     where organization_id = 'bbbbbbb1-0000-0000-0000-000000000001'
       and user_id = '10000000-0000-0000-0000-000000000002'; $$,
  '42501',
  NULL,
  'organization admin cannot promote a membership through the Data API'
);

-- create_activity targets the explicitly supplied organization.
select lives_ok(
  $$ select * from public.create_activity('Scoped Activity', 'bbbbbbb1-0000-0000-0000-000000000001'); $$,
  'organization admin can create an activity for an explicit organization'
);

select is(
  (
    select organization_id
    from public.activities
    where name = 'Scoped Activity'
    order by created_at desc
    limit 1
  ),
  'bbbbbbb1-0000-0000-0000-000000000001',
  'create_activity honors the explicit target organization'
);

-- A plain member cannot create activities at all.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$ select * from public.create_activity('Sneaky', 'bbbbbbb1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'plain member cannot create activities'
);

select * from finish();
rollback;
