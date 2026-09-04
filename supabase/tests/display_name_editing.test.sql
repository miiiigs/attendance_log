begin;

create extension if not exists pgtap;

select plan(36);

-- ============================================================================
-- Display-name editing tests for:
--   * update_profile_display_name(text)
--   * update_own_community_display_name(uuid, text)
--
-- Identities model real Auth states:
--   * guestG    -> anonymous (is_anonymous, no email)
--   * registeredR -> permanent + verified email
--   * adminC     -> permanent + verified email (Community Admin)
--   * memberC    -> permanent + verified email (Community member)
--   * attacker   -> permanent + verified email (also a Community member)
-- ============================================================================

insert into public.organizations (id, name, code, slug, status, timezone) values
  ('ddddddd1-0000-0000-0000-000000000001', 'Community C', 'ORGDC', 'community-c', 'active', 'Asia/Manila');

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at
)
select * from (values
  ('40000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, NULL::text, 'x'::text, NULL::timestamptz, true::boolean, now(), now()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'registeredr@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'adminc@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, 'memberc@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'attacker@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (id, username, first_name, last_name, email, display_name, role, status, platform_role) values
  ('40000000-0000-0000-0000-000000000001', 'guest_dn', NULL, NULL, NULL, 'Guest G', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000002', 'registered_dn', 'Registered', 'R', 'registeredr@example.com', 'R Global', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000003', 'admin_dn', 'Admin', 'C', 'adminc@example.com', 'Admin C', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000004', 'member_dn', 'Member', 'C', 'memberc@example.com', 'Member C', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000005', 'attacker_dn', 'Attacker', 'A', 'attacker@example.com', 'Attacker', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, username, role, status, display_name) values
  ('ddddddd1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'adminc_0001', 'organization_admin', 'active', 'Admin Community'),
  ('ddddddd1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'memberc_0001', 'member', 'active', 'Member Community'),
  ('ddddddd1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'attacker_0001', 'member', 'active', 'Attacker Community');

select set_config('request.jwt.claim.role', 'authenticated', true);

-- ============================================================================
-- Global display name: unauthenticated caller rejected (ACL)
-- ============================================================================
set role anon;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select * from public.update_profile_display_name('Sneaky'); $$,
  '42501',
  NULL,
  'an unauthenticated caller cannot invoke update_profile_display_name'
);
reset role;

-- ============================================================================
-- Global display name: blank and oversized rejected (guest)
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true); -- guestG

select throws_ok(
  $$ select * from public.update_profile_display_name('   '); $$,
  'P0001',
  'Display name is required.',
  'a blank global display name is rejected'
);

select throws_ok(
  $$ select * from public.update_profile_display_name(repeat('a', 81)); $$,
  'P0001',
  'Display name must be 80 characters or fewer.',
  'an over-length global display name is rejected'
);

-- ============================================================================
-- Global display name: active guest updates own name, nothing else changes
-- ============================================================================
select lives_ok(
  $$ select * from public.update_profile_display_name('Guest Updated'); $$,
  'an active guest can update their own global display name'
);

select is(
  (select display_name from public.profiles where id = '40000000-0000-0000-0000-000000000001'),
  'Guest Updated',
  'the guest global display name is updated'
);

select is(
  (select role::text from public.profiles where id = '40000000-0000-0000-0000-000000000001'),
  'person',
  'the guest profile role is unchanged'
);

select is(
  (select status::text from public.profiles where id = '40000000-0000-0000-0000-000000000001'),
  'active',
  'the guest profile status is unchanged'
);

select is(
  (select username from public.profiles where id = '40000000-0000-0000-0000-000000000001'),
  'guest_dn',
  'the guest profile username is unchanged'
);

select is(
  (select email from public.profiles where id = '40000000-0000-0000-0000-000000000001'),
  NULL,
  'the guest profile email remains null'
);

-- ============================================================================
-- Global display name: active registered user updates own name
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true); -- registeredR

select lives_ok(
  $$ select * from public.update_profile_display_name('R Updated'); $$,
  'an active registered user can update their own global display name'
);

select is(
  (select display_name from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'R Updated',
  'the registered global display name is updated'
);

select is(
  (select email from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'registeredr@example.com',
  'the registered profile email is unchanged'
);

-- ============================================================================
-- Global display name: a caller can never target or modify another profile
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true); -- attacker

select lives_ok(
  $$ select * from public.update_profile_display_name('Attacker Updated'); $$,
  'a caller can only update their own profile'
);

select is(
  (select display_name from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'R Updated',
  'a caller cannot modify another profile''s display name'
);

select is(
  (select email from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'registeredr@example.com',
  'a caller cannot modify another profile''s email'
);

select is(
  (select username from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'registered_dn',
  'a caller cannot modify another profile''s username'
);

select is(
  (select role::text from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'person',
  'a caller cannot modify another profile''s role'
);

select is(
  (select status::text from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
  'active',
  'a caller cannot modify another profile''s status'
);

-- ============================================================================
-- Community display name: unauthenticated caller rejected (ACL)
-- ============================================================================
set role anon;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', 'Sneaky'); $$,
  '42501',
  NULL,
  'an unauthenticated caller cannot invoke update_own_community_display_name'
);
reset role;

-- ============================================================================
-- Community display name: blank and oversized rejected (member)
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true); -- memberC

select throws_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', '   '); $$,
  'P0001',
  'Display name is required.',
  'a blank Community display name is rejected'
);

select throws_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', repeat('b', 81)); $$,
  'P0001',
  'Display name must be 80 characters or fewer.',
  'an over-length Community display name is rejected'
);

-- ============================================================================
-- Community display name: active member updates own membership name
-- ============================================================================
select lives_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', 'Member Updated'); $$,
  'an active member can update their own Community display name'
);

select is(
  (select display_name from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'Member Updated',
  'the member Community display name is updated'
);

select is(
  (select role::text from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'member',
  'the membership role is unchanged'
);

select is(
  (select status::text from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'active',
  'the membership status is unchanged'
);

select is(
  (select username from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'memberc_0001',
  'the membership username is unchanged'
);

select is(
  (select organization_id from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'ddddddd1-0000-0000-0000-000000000001',
  'the membership organization is unchanged'
);

select is(
  (select user_id from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  '40000000-0000-0000-0000-000000000004',
  'the membership user_id is unchanged'
);

-- ============================================================================
-- Community display name: Community Admin updates their own name
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true); -- adminC

select lives_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', 'Admin Updated'); $$,
  'a Community Admin can update their own Community display name'
);

select is(
  (select display_name from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000003'),
  'Admin Updated',
  'the admin Community display name is updated'
);

-- ============================================================================
-- Community display name: a member cannot edit another member
-- ============================================================================
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true); -- attacker (also a member)

select lives_ok(
  $$ select * from public.update_own_community_display_name('ddddddd1-0000-0000-0000-000000000001', 'Attacker Updated'); $$,
  'a member can only update their own Community display name'
);

select is(
  (select display_name from public.organization_memberships
   where organization_id = 'ddddddd1-0000-0000-0000-000000000001'
     and user_id = '40000000-0000-0000-0000-000000000004'),
  'Member Updated',
  'a member cannot edit another member''s Community display name'
);

-- ============================================================================
-- ACL: authenticated-only execute
-- ============================================================================
select ok(
  not has_function_privilege('anon', 'public.update_profile_display_name(text)', 'execute'),
  'anonymous role cannot execute update_profile_display_name'
);

select ok(
  has_function_privilege('authenticated', 'public.update_profile_display_name(text)', 'execute'),
  'authenticated role can execute update_profile_display_name'
);

select ok(
  not has_function_privilege('anon', 'public.update_own_community_display_name(uuid, text)', 'execute'),
  'anonymous role cannot execute update_own_community_display_name'
);

select ok(
  has_function_privilege('authenticated', 'public.update_own_community_display_name(uuid, text)', 'execute'),
  'authenticated role can execute update_own_community_display_name'
);

select * from finish();
rollback;
