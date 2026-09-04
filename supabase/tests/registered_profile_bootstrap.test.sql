begin;

create extension if not exists pgtap;

select plan(24);

-- ============================================================================
-- Registered profile bootstrap tests for ensure_registered_profile(display_name)
--
-- Identities model real Auth states:
--   * anonA      -> anonymous (is_anonymous, no email)
--   * unverifiedU-> permanent but email NOT yet confirmed
--   * verifiedV  -> permanent + verified email (fresh Email/Google user)
--   * attacker   -> permanent + verified attacker@example.com
--   * upgradedG  -> permanent + verified email with an EXISTING guest profile
--                   (email null, guest display name) => must be preserved
-- ============================================================================

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at
)
select * from (values
  ('30000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, NULL::text, 'x'::text, NULL::timestamptz, true::boolean, now(), now()),
  ('30000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'verifiedv@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('30000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'unverifiedu@example.com'::text, 'x'::text, NULL::timestamptz, false::boolean, now(), now()),
  ('30000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, 'attacker@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('30000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'upgraded@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at)
on conflict (id) do nothing;

select set_config('request.jwt.claim.role', 'authenticated', true);

-- ============================================================================
-- Unauthenticated caller cannot invoke the RPC (ACL)
-- ============================================================================
set role anon;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select * from public.ensure_registered_profile('Sneaky'); $$,
  '42501',
  NULL,
  'an unauthenticated caller cannot invoke ensure_registered_profile'
);
reset role;

-- ============================================================================
-- Anonymous caller rejected
-- ============================================================================
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true); -- anonA
select throws_ok(
  $$ select * from public.ensure_registered_profile('Anonymous'); $$,
  'P0001',
  'Verify your email before continuing.',
  'an anonymous guest cannot bootstrap a registered profile'
);

-- ============================================================================
-- Unverified caller rejected
-- ============================================================================
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true); -- unverifiedU
select throws_ok(
  $$ select * from public.ensure_registered_profile('Unverified'); $$,
  'P0001',
  'Verify your email before continuing.',
  'a permanent user with an unconfirmed email cannot bootstrap a profile'
);

-- ============================================================================
-- Verified permanent user bootstraps their OWN profile
-- ============================================================================
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true); -- verifiedV

select lives_ok(
  $$ select * from public.ensure_registered_profile('Verified V'); $$,
  'a verified permanent user can bootstrap their own profile'
);

select is(
  (select count(*)::int from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  1,
  'exactly one profile row is created for the verified user'
);

select is(
  (select email from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'verifiedv@example.com',
  'the profile email is the verified Auth email (authoritative, not client input)'
);

select is(
  (select display_name from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'Verified V',
  'the provided display name is stored as ordinary display data'
);

select is(
  (select left(username, 5) from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'user_',
  'a generated internal username is created for the profile'
);

select is(
  (select role::text from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'person',
  'bootstrap profiles default to the normal person role'
);

select is(
  (select status::text from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'active',
  'bootstrap profiles default to active status'
);

-- ============================================================================
-- Idempotent: repeated calls never duplicate the profile
-- ============================================================================
select lives_ok(
  $$ select * from public.ensure_registered_profile('Different Name'); $$,
  'repeated calls are safe'
);

select is(
  (select count(*)::int from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  1,
  'a repeated call does not duplicate the profile'
);

select is(
  (select display_name from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'Verified V',
  'an existing display name is preserved (never overwritten)'
);

-- ============================================================================
-- Cannot bootstrap or modify another user's profile
-- ============================================================================
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000004', true); -- attacker

select lives_ok(
  $$ select * from public.ensure_registered_profile('Attacker'); $$,
  'an attacker can bootstrap their own profile only'
);

select is(
  (select count(*)::int from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  1,
  'an attacker cannot create a second profile for another user'
);

select is(
  (select email from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'verifiedv@example.com',
  'an attacker cannot change another profile''s email'
);

select is(
  (select display_name from public.profiles where id = '30000000-0000-0000-0000-000000000002'),
  'Verified V',
  'an attacker cannot change another profile''s display name'
);

-- ============================================================================
-- Existing guest-upgraded profile/history is preserved (same user.id)
-- ============================================================================
insert into public.profiles (id, username, first_name, last_name, email, display_name, role, status) values
  ('30000000-0000-0000-0000-000000000005', 'guest_preexisting', 'Guest', 'Old', NULL, 'Guest Old', 'person', 'active')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000005', true); -- upgradedG

select lives_ok(
  $$ select * from public.ensure_registered_profile('New Preferred Name'); $$,
  'an upgraded guest can run the bootstrap'
);

select is(
  (select count(*)::int from public.profiles where id = '30000000-0000-0000-0000-000000000005'),
  1,
  'an upgraded guest profile is not duplicated'
);

select is(
  (select email from public.profiles where id = '30000000-0000-0000-0000-000000000005'),
  'upgraded@example.com',
  'the upgraded guest profile email is backfilled from the verified Auth email'
);

select is(
  (select display_name from public.profiles where id = '30000000-0000-0000-0000-000000000005'),
  'Guest Old',
  'the upgraded guest display name and history are preserved'
);

select is(
  (select username from public.profiles where id = '30000000-0000-0000-0000-000000000005'),
  'guest_preexisting',
  'the upgraded guest internal username is preserved'
);

-- ============================================================================
-- ACL: authenticated callers have execute, anon does not
-- ============================================================================
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);

select ok(
  not has_function_privilege('anon', 'public.ensure_registered_profile(text)', 'execute'),
  'anonymous role cannot execute ensure_registered_profile'
);

select ok(
  has_function_privilege('authenticated', 'public.ensure_registered_profile(text)', 'execute'),
  'authenticated role can execute ensure_registered_profile'
);

-- ============================================================================
-- Cleanup
-- ============================================================================
select finish();
rollback;
