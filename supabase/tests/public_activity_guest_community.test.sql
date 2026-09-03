begin;

create extension if not exists pgtap;

select plan(47);

-- ============================================================================
-- Setup: two Communities and identities modeling real Auth states:
--   * guestG      -> anonymous (is_anonymous, no email)
--   * unverifiedU -> permanent but email NOT yet confirmed (email-link state)
--   * registeredR -> permanent + verified email
--   * attacker    -> permanent + verified attacker@example.com
-- ============================================================================
insert into public.organizations (id, name, code, slug, status, timezone, description) values
  ('ccccccc1-0000-0000-0000-000000000001', 'Community C', 'ORGC', 'community-c', 'active', 'Asia/Manila', 'Community C description'),
  ('ccccccc2-0000-0000-0000-000000000002', 'Community D', 'ORGD', 'community-d', 'active', 'Asia/Manila', null);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at
)
select * from (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'adminc@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'memberc@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'admind@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, NULL::text, 'x'::text, NULL::timestamptz, true::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'registeredr@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000006'::uuid, 'authenticated'::text, 'authenticated'::text, 'unverified@example.com'::text, 'x'::text, NULL::timestamptz, false::boolean, now(), now()),
  ('20000000-0000-0000-0000-000000000007'::uuid, 'authenticated'::text, 'authenticated'::text, 'attacker@example.com'::text, 'x'::text, now()::timestamptz, false::boolean, now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (id, username, first_name, last_name, email, role, status, platform_role) values
  ('20000000-0000-0000-0000-000000000001', 'adminc', 'Admin', 'C', 'adminc@example.com', 'person', 'active', 'user'),
  ('20000000-0000-0000-0000-000000000002', 'memberc', 'Member', 'C', 'memberc@example.com', 'person', 'active', 'user'),
  ('20000000-0000-0000-0000-000000000003', 'admind', 'Admin', 'D', 'admind@example.com', 'person', 'active', 'user'),
  ('20000000-0000-0000-0000-000000000005', 'registeredr', 'Registered', 'R', 'registeredr@example.com', 'person', 'active', 'user'),
  ('20000000-0000-0000-0000-000000000006', 'unverifiedu', 'Unverified', 'U', 'unverified@example.com', 'person', 'active', 'user'),
  ('20000000-0000-0000-0000-000000000007', 'attacker', 'Attacker', 'A', 'attacker@example.com', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, username, role, status) values
  ('ccccccc1-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'adminc', 'organization_admin', 'active'),
  ('ccccccc1-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'memberc', 'member', 'active'),
  ('ccccccc2-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'admind', 'organization_admin', 'active');

select set_config('request.jwt.claim.role', 'authenticated', true);

-- ============================================================================
-- Verified Auth email source of truth
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select is(
  public.current_verified_auth_email(),
  NULL,
  'anonymous guest has no verified auth email'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true); -- unverifiedU

select is(
  public.current_verified_auth_email(),
  NULL,
  'permanent user with unconfirmed email has no verified auth email'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true); -- registeredR

select is(
  public.current_verified_auth_email(),
  'registeredr@example.com',
  'verified permanent user returns their normalized auth email'
);

-- ============================================================================
-- Guest identity: display name only, no email, cannot create or join
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select lives_ok(
  $$ select * from public.create_guest_profile('Guest G'); $$,
  'a guest can create a display-name-only profile'
);

select is(
  (select display_name from public.profiles where id = '20000000-0000-0000-0000-000000000004'),
  'Guest G',
  'guest profile stores the chosen display name'
);

select is(
  (select email from public.profiles where id = '20000000-0000-0000-0000-000000000004'),
  NULL,
  'guest profile has no email'
);

select throws_ok(
  $$ select * from public.create_public_activity('Guest Sneaky Activity'); $$,
  'P0001',
  'Create an account and verify your email to create activities.',
  'a guest cannot create an activity'
);

select throws_ok(
  $$ select * from public.join_organization_by_code('ORGC', 'Guest G'); $$,
  'P0001',
  'Create an account and verify your email before joining a Community.',
  'a guest cannot join a Community'
);

select throws_ok(
  $$ select * from public.create_activity('Sneaky', 'ccccccc1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'a guest cannot create a Community activity'
);

select throws_ok(
  $$ select public.generate_membership_username('ccccccc1-0000-0000-0000-000000000001', 'member'); $$,
  'P0001',
  'Only organization administrators can generate usernames.',
  'a guest cannot generate membership usernames'
);

-- ============================================================================
-- Unverified email-link state cannot create or join
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true); -- unverifiedU

select throws_ok(
  $$ select * from public.create_public_activity('Unverified Activity'); $$,
  'P0001',
  'Create an account and verify your email to create activities.',
  'an unverified email-link state cannot create an activity'
);

select throws_ok(
  $$ select * from public.join_organization_by_code('ORGC', 'Unverified U'); $$,
  'P0001',
  'Create an account and verify your email before joining a Community.',
  'an unverified email-link state cannot join a Community'
);

-- ============================================================================
-- Public activity creation (verified permanent user)
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true); -- registeredR

select lives_ok(
  $$ select * from public.create_public_activity('Public Seminar'); $$,
  'a verified Community-less user can create a public activity'
);

select id as public_activity_id
from public.activities
where created_by = '20000000-0000-0000-0000-000000000005'
  and status = 'active'
order by created_at desc
limit 1 \gset

select is(
  (select organization_id from public.activities where id = :'public_activity_id'),
  NULL,
  'a public activity has no organization_id'
);

select is(
  (select visibility::text from public.activities where id = :'public_activity_id'),
  'anyone_with_code',
  'a public activity is anyone_with_code'
);

-- ============================================================================
-- Community activity creation + visibility
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true); -- adminC

select lives_ok(
  $$ select * from public.create_activity('Internal Staff Meeting', 'ccccccc1-0000-0000-0000-000000000001'); $$,
  'a Community admin can create an activity under their Community'
);

select id as internal_activity_id
from public.activities
where organization_id = 'ccccccc1-0000-0000-0000-000000000001'
  and name = 'Internal Staff Meeting'
limit 1 \gset

select is(
  (select visibility::text from public.activities where id = :'internal_activity_id'),
  'community_only',
  'a Community activity defaults to community_only'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true); -- adminD

select lives_ok(
  $$ select * from public.create_activity('Public Orientation', 'ccccccc2-0000-0000-0000-000000000002', 'anyone_with_code'); $$,
  'a Community admin can create an anyone_with_code activity'
);

select id as open_activity_id
from public.activities
where organization_id = 'ccccccc2-0000-0000-0000-000000000002'
  and name = 'Public Orientation'
limit 1 \gset

select is(
  (select visibility::text from public.activities where id = :'open_activity_id'),
  'anyone_with_code',
  'an explicit anyone_with_code activity is honored'
);

-- ============================================================================
-- Creation authorization: only admins of the Community may create under it
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true); -- memberC

select throws_ok(
  $$ select * from public.create_activity('Sneaky', 'ccccccc1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'a plain member cannot create a Community activity'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true); -- adminC

select throws_ok(
  $$ select * from public.create_activity('Sneaky', 'ccccccc2-0000-0000-0000-000000000002'); $$,
  'P0001',
  'Only organization administrators can create activities.',
  'an admin cannot create under a Community they do not administer'
);

-- ============================================================================
-- Community join authorization by verified email + preferred display name
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true); -- registeredR

select throws_ok(
  $$ select * from public.join_organization_by_code('ORGC', 'R C Name'); $$,
  'P0001',
  'Your account is not registered with this Community. Please contact a Community administrator.',
  'an unauthorized verified email cannot join merely by knowing the code'
);

insert into public.organization_join_authorizations (organization_id, normalized_email, status, created_by) values
  ('ccccccc1-0000-0000-0000-000000000001', 'registeredr@example.com', 'pending', '20000000-0000-0000-0000-000000000001');

select throws_ok(
  $$ select * from public.join_organization_by_code('ORGC', '   '); $$,
  'P0001',
  'Display name is required.',
  'a blank Community display name is rejected'
);

select lives_ok(
  $$ select * from public.join_organization_by_code('ORGC', 'R C Name'); $$,
  'an authorized verified email can join the Community with a display name'
);

select is(
  (select role::text from public.organization_memberships
   where organization_id = 'ccccccc1-0000-0000-0000-000000000001'
     and user_id = '20000000-0000-0000-0000-000000000005'),
  'member',
  'joining creates a member membership'
);

select is(
  (select display_name from public.organization_memberships
   where organization_id = 'ccccccc1-0000-0000-0000-000000000001'
     and user_id = '20000000-0000-0000-0000-000000000005'),
  'R C Name',
  'the Community-specific display name is stored on the membership'
);

select is(
  (select status::text from public.organization_join_authorizations
   where organization_id = 'ccccccc1-0000-0000-0000-000000000001'
     and normalized_email = 'registeredr@example.com'),
  'claimed',
  'the authorization is claimed after joining'
);

-- Cross-Community: C authorization does not grant D.
select throws_ok(
  $$ select * from public.join_organization_by_code('ORGD', 'R D Name'); $$,
  'P0001',
  'Your account is not registered with this Community. Please contact a Community administrator.',
  'cross-Community authorization fails'
);

insert into public.organization_join_authorizations (organization_id, normalized_email, status, created_by) values
  ('ccccccc2-0000-0000-0000-000000000002', 'registeredr@example.com', 'pending', '20000000-0000-0000-0000-000000000003');

select lives_ok(
  $$ select * from public.join_organization_by_code('ORGD', 'R D Name'); $$,
  'the same account can use a different display name in another Community'
);

select is(
  (select display_name from public.organization_memberships
   where organization_id = 'ccccccc2-0000-0000-0000-000000000002'
     and user_id = '20000000-0000-0000-0000-000000000005'),
  'R D Name',
  'the second Community keeps its own display name'
);

-- ============================================================================
-- Email impersonation fails closed
-- ============================================================================
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'),
  'authenticated clients cannot update profiles.email'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000007', true); -- attacker
select throws_ok(
  $$ update public.profiles set email = 'authorized@example.com' where id = '20000000-0000-0000-0000-000000000007'; $$,
  '42501',
  NULL,
  'an attacker cannot rewrite profiles.email to a pre-authorized Community email'
);
reset role;

-- ============================================================================
-- Public/community activity scanning + lifecycle
-- ============================================================================
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true); -- registeredR (creator)

select token as public_qr_token
from public.create_activity_qr_session(:'public_activity_id', 3600) \gset

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select lives_ok(
  format('select * from public.scan_activity(%L);', :'public_qr_token'),
  'a guest can join a public activity'
);

select ok(
  exists(
    select 1 from public.activity_logs
    where activity_id = :'public_activity_id'
      and user_id = '20000000-0000-0000-0000-000000000004'
      and membership_id is null
  ),
  'a public activity log is keyed on the global user id with no membership'
);

select throws_ok(
  format('select * from public.scan_activity(%L);', :'public_qr_token'),
  'P0001',
  'You are already timed in to this activity. Use Leave Activity when you are ready to leave.',
  'a second scan by a guest is rejected'
);

select time_out as guest_leave_time_out
from public.leave_activity(:'public_activity_id') \gset

select ok(
  :'guest_leave_time_out'::timestamptz is not null,
  'a guest can leave a public activity (records time out)'
);

-- Community-only activity rejects a non-member guest.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true); -- adminC

select token as internal_qr_token
from public.create_activity_qr_session(:'internal_activity_id', 3600) \gset

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select throws_ok(
  format('select * from public.scan_activity(%L);', :'internal_qr_token'),
  'P0001',
  'This activity is for Community members only.',
  'a guest cannot access a Community-only activity'
);

-- anyone_with_code Community activity accepts a non-member guest.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true); -- adminD

select token as open_qr_token
from public.create_activity_qr_session(:'open_activity_id', 3600) \gset

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select lives_ok(
  format('select * from public.scan_activity(%L);', :'open_qr_token'),
  'a guest can join an anyone_with_code Community activity'
);

-- A Community member can time in to their Community-only activity.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true); -- memberC

select lives_ok(
  format('select * from public.scan_activity(%L);', :'internal_qr_token'),
  'a Community member can time in to a Community-only activity'
);

-- Ending a Community activity auto-completes open participants.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true); -- adminC

select lives_ok(
  format('select * from public.end_activity(%L);', :'internal_activity_id'),
  'a Community admin can end their Community activity'
);

select ended_at as internal_ended_at
from public.activities
where id = :'internal_activity_id' \gset

select is(
  (select time_out from public.activity_logs
   where activity_id = :'internal_activity_id'
     and user_id = '20000000-0000-0000-0000-000000000002'),
  :'internal_ended_at'::timestamptz,
  'ending a Community activity auto-completes the open member with the same timestamp'
);

-- Only the creator can end a public activity.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true); -- memberC

select throws_ok(
  format('select * from public.end_activity(%L);', :'public_activity_id'),
  'P0001',
  'Only the activity creator can end this activity.',
  'a non-creator cannot end a public activity'
);

-- A Community member can still create a public activity (Public-only path).
select lives_ok(
  $$ select * from public.create_public_activity('Member Public Activity'); $$,
  'a Community member can create a public activity'
);

-- ============================================================================
-- Cross-tenant integrity: composite FKs reject mismatched Community keys
-- ============================================================================
select throws_ok(
  format(
    'insert into public.activity_logs (organization_id, activity_id, membership_id, user_id, time_in) values (%L, %L, NULL, %L, now());',
    'ccccccc2-0000-0000-0000-000000000002',
    :'internal_activity_id',
    '20000000-0000-0000-0000-000000000005'
  ),
  '23503',
  NULL,
  'activity_logs rejects an activity whose Community does not match the log organization'
);

select throws_ok(
  format(
    'insert into public.activity_scans (organization_id, activity_id, membership_id, user_id, qr_session_id, scan_type, scanned_at) values (%L, %L, (select id from public.organization_memberships where user_id = %L and organization_id = %L), %L, NULL, %L, now());',
    'ccccccc2-0000-0000-0000-000000000002',
    :'internal_activity_id',
    '20000000-0000-0000-0000-000000000002',
    'ccccccc1-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'time_in'
  ),
  '23503',
  NULL,
  'activity_scans rejects a membership whose Community does not match the scan organization'
);

-- ============================================================================
-- Guest history preserved on the same global user identity
-- ============================================================================
select is(
  (select count(*)::integer from public.activity_logs
   where user_id = '20000000-0000-0000-0000-000000000004'),
  2,
  'guest participation history (public + anyone_with_code) is preserved'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true); -- guestG

select throws_ok(
  $$ select public.sync_profile_email(); $$,
  'P0001',
  'Verify your email before continuing.',
  'sync_profile_email refuses before email verification'
);

select * from finish();
rollback;
