begin;

create extension if not exists pgtap;

select plan(42);

insert into public.organizations (id, name, code, slug, status, timezone) values
  ('eeeeeee1-0000-0000-0000-000000000001', 'UGC Org A', 'UGCA', 'ugc-org-a', 'active', 'Asia/Manila'),
  ('eeeeeee2-0000-0000-0000-000000000002', 'UGC Org B', 'UGCB', 'ugc-org-b', 'active', 'Asia/Manila')
on conflict (id) do nothing;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at
)
select * from (values
  ('40000000-0000-0000-0000-000000000001'::uuid, 'authenticated'::text, 'authenticated'::text, 'platform@example.com'::text, 'x'::text, now(), false, now(), now()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'authenticated'::text, 'authenticated'::text, 'admina@example.com'::text, 'x'::text, now(), false, now(), now()),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'authenticated'::text, 'authenticated'::text, 'membera@example.com'::text, 'x'::text, now(), false, now(), now()),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'authenticated'::text, 'authenticated'::text, 'adminb@example.com'::text, 'x'::text, now(), false, now(), now()),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'memberb@example.com'::text, 'x'::text, now(), false, now(), now()),
  ('40000000-0000-0000-0000-000000000006'::uuid, 'authenticated'::text, 'authenticated'::text, 'membera2@example.com'::text, 'x'::text, now(), false, now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (id, username, first_name, last_name, email, role, status, platform_role) values
  ('40000000-0000-0000-0000-000000000001', 'platform', 'Platform', 'Admin', 'platform@example.com', 'person', 'active', 'platform_admin'),
  ('40000000-0000-0000-0000-000000000002', 'admina', 'Admin', 'A', 'admina@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000003', 'membera', 'Member', 'A', 'membera@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000004', 'adminb', 'Admin', 'B', 'adminb@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000005', 'memberb', 'Member', 'B', 'memberb@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000006', 'membera2', 'Member', 'A2', 'membera2@example.com', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, username, role, status) values
  ('eeeeeee1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'admina', 'organization_admin', 'active'),
  ('eeeeeee1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'membera', 'member', 'active'),
  ('eeeeeee1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006', 'membera2', 'member', 'active'),
  ('eeeeeee2-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004', 'adminb', 'organization_admin', 'active'),
  ('eeeeeee2-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000005', 'memberb', 'member', 'active')
on conflict do nothing;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$ select * from public.create_activity('Needs Terms', 'eeeeeee1-0000-0000-0000-000000000001'); $$,
  'P0001',
  'You must agree to the Terms of Use and Acceptable Use Policy before creating an activity.',
  'activity creation rejects missing Terms acceptance'
);

select lives_ok(
  $$ select * from public.create_activity('Reportable Activity', 'eeeeeee1-0000-0000-0000-000000000001', accepted_terms => true); $$,
  'organization admin can create activity after Terms acceptance'
);

select id as activity_a_id
from public.activities
where name = 'Reportable Activity'
  and organization_id = 'eeeeeee1-0000-0000-0000-000000000001' \gset

select token as qr_token_a
from public.create_activity_qr_session(:'activity_a_id', 3600) \gset

select lives_ok(
  $$ select * from public.create_public_activity('Public UUID Alone', accepted_terms => true); $$,
  'registered creator can create public activity'
);

select id as public_probe_id
from public.activities
where name = 'Public UUID Alone'
  and created_by = '40000000-0000-0000-0000-000000000002' \gset

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true);

select throws_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'other', null); $$, :'activity_a_id'),
  'P0001',
  'Activity not found.',
  'community_only cross-tenant report is denied'
);

select throws_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'other', null); $$, :'public_probe_id'),
  'P0001',
  'Activity not found.',
  'anyone_with_code activity UUID alone is insufficient to report'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);

select lives_ok(
  format($$ select * from public.scan_activity(%L); $$, :'qr_token_a'),
  'legitimate member can participate before reporting'
);

select lives_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'harassment_or_bullying', 'Please review'); $$, :'activity_a_id'),
  'legitimate participant can report an accessible activity'
);

select is(
  (select reported_creator_user_id from public.activity_reports where activity_id = :'activity_a_id'),
  '40000000-0000-0000-0000-000000000002'::uuid,
  'reported creator is derived server-side'
);

select lives_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'spam_or_scam', 'Updated details'); $$, :'activity_a_id'),
  'duplicate pending report is handled idempotently'
);

select is(
  (select count(*)::integer from public.activity_reports where activity_id = :'activity_a_id' and reporter_user_id = auth.uid()),
  1,
  'duplicate pending reports are not multiplied'
);

select throws_ok(
  format($$ select public.can_report_activity(%L, %L); $$, :'activity_a_id', '40000000-0000-0000-0000-000000000002'),
  '42883',
  null,
  'arbitrary reporter UUID cannot alter authorization'
);

select lives_ok(
  format($$ select * from public.block_activity_organizer(%L); $$, :'activity_a_id'),
  'block organizer derives creator server-side'
);

select is(
  (select blocked_user_id from public.user_blocks where blocker_user_id = auth.uid()),
  '40000000-0000-0000-0000-000000000002'::uuid,
  'blocked organizer is the activity creator'
);

select throws_ok(
  format($$ select * from public.block_activity_organizer(%L); $$, :'public_probe_id'),
  'P0001',
  'Activity not found.',
  'block organizer cannot use an inaccessible activity UUID'
);

select throws_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'other', null); $$, :'activity_a_id'),
  'P0001',
  'Activity not found.',
  'blocked organizer content cannot be reported through a UUID bypass'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);

select throws_ok(
  format($$ select * from public.block_activity_organizer(%L); $$, :'activity_a_id'),
  'P0001',
  'You cannot block yourself.',
  'self-block is denied'
);

set role authenticated;

select is(
  (select count(*)::integer from public.user_blocks where blocked_user_id = auth.uid()),
  0,
  'blocked user cannot see who blocked them'
);

reset role;

select lives_ok(
  $$ select * from public.create_public_activity('Blocked Organizer Public', accepted_terms => true); $$,
  'blocked organizer can still create content for other users'
);

select id as blocked_public_id
from public.activities
where name = 'Blocked Organizer Public'
  and created_by = '40000000-0000-0000-0000-000000000002' \gset

select token as blocked_public_qr
from public.create_activity_qr_session(:'blocked_public_id', 3600) \gset

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);

set role authenticated;

select is(
  (select count(*)::integer from public.activities where id = :'blocked_public_id'),
  0,
  'blocked organizer content is hidden only for blocker'
);

reset role;

select throws_ok(
  format($$ select * from public.scan_activity(%L); $$, :'blocked_public_qr'),
  'P0001',
  'Activity is unavailable.',
  'blocked organizer QR is rejected for blocker'
);

select is(
  (select count(*)::integer from public.activity_logs where activity_id = :'blocked_public_id'),
  0,
  'blocked scan creates no activity_log'
);

select is(
  (select count(*)::integer from public.activity_scans where activity_id = :'blocked_public_id'),
  0,
  'blocked scan creates no activity_scan'
);

select lives_ok(
  $$ select public.unblock_user('40000000-0000-0000-0000-000000000002'); $$,
  'unblock is available'
);

select is(
  (select count(*)::integer from public.user_blocks where blocker_user_id = auth.uid()),
  0,
  'unblock removes the block'
);

select lives_ok(
  format($$ select * from public.scan_activity(%L); $$, :'blocked_public_qr'),
  'unblock restores intended access'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000006', true);

select lives_ok(
  format($$ select * from public.scan_activity(%L); $$, :'blocked_public_qr'),
  'another user remains unaffected by the block'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);

select throws_ok(
  format($$ select * from public.platform_hide_activity_report((select id from public.activity_reports where activity_id = %L)); $$, :'activity_a_id'),
  'P0001',
  'Only platform administrators can moderate reports.',
  'Community Admin cannot moderate another Community or public report queue'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

select lives_ok(
  format($$ select * from public.platform_hide_activity_report((select id from public.activity_reports where activity_id = %L)); $$, :'activity_a_id'),
  'Platform Admin can hide a reported activity'
);

select results_eq(
  format($$ select status, moderation_status from public.activities where id = %L $$, :'activity_a_id'),
  $$ values ('ended'::public.activity_status, 'hidden'::public.activity_moderation_status) $$,
  'hidden active activity is ended and hidden'
);

select isnt_empty(
  format($$ select 1 from public.qr_sessions where activity_id = %L and status = 'revoked' $$, :'activity_a_id'),
  'active QR is revoked when activity is hidden'
);

select is(
  (select count(*)::integer from public.activity_logs where activity_id = :'activity_a_id' and time_out is not null),
  1,
  'open participants get one Time Out when active activity is hidden'
);

select is(
  (select count(*)::integer from public.activity_scans where activity_id = :'activity_a_id' and scan_type = 'time_out'),
  1,
  'moderation records one Time Out scan'
);

select is(
  (select count(*)::integer from public.activity_logs where activity_id = :'activity_a_id'),
  1,
  'attendance rows remain preserved'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$ select * from public.create_activity('Replacement Activity', 'eeeeeee1-0000-0000-0000-000000000001', accepted_terms => true); $$,
  'Community can create replacement after hidden active activity is ended'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);

select throws_ok(
  format($$ select * from public.scan_activity(%L); $$, :'qr_token_a'),
  'P0001',
  'QR code has expired.',
  'old moderated QR cannot create attendance'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

select lives_ok(
  format($$ select * from public.platform_restore_activity(%L); $$, :'activity_a_id'),
  'restore visibility succeeds'
);

select results_eq(
  format($$ select status, ended_at is not null, moderation_status from public.activities where id = %L $$, :'activity_a_id'),
  $$ values ('ended'::public.activity_status, true, 'visible'::public.activity_moderation_status) $$,
  'restore does not reactivate the ended activity'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);

select lives_ok(
  $$ select * from public.create_public_activity('Deidentified Creator Activity', accepted_terms => true); $$,
  'second creator can create public deidentified fixture'
);

select id as deidentified_id
from public.activities
where name = 'Deidentified Creator Activity'
  and created_by = '40000000-0000-0000-0000-000000000004' \gset

select token as deidentified_qr
from public.create_activity_qr_session(:'deidentified_id', 3600) \gset

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true);

select lives_ok(
  format($$ select * from public.scan_activity(%L); $$, :'deidentified_qr'),
  'participant can encounter public activity before creator deidentification'
);

update public.activities
set created_by = null
where id = :'deidentified_id';

select lives_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'other', 'creator removed'); $$, :'deidentified_id'),
  'deidentified creator activity can still be content-reported'
);

select throws_ok(
  format($$ select * from public.report_activity(%L, 'organizer', 'other', null); $$, :'deidentified_id'),
  'P0001',
  'Organizer is unavailable.',
  'organizer report unavailable when creator is missing'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true);

set role authenticated;

select is(
  (select count(*)::integer from public.activity_reports),
  0,
  'report table remains non-enumerable'
);

reset role;

select * from finish();

rollback;
