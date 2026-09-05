begin;

create extension if not exists pgtap;

select plan(16);

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
  ('40000000-0000-0000-0000-000000000005'::uuid, 'authenticated'::text, 'authenticated'::text, 'memberb@example.com'::text, 'x'::text, now(), false, now(), now())
) as v (id, aud, role, email, encrypted_password, email_confirmed_at, is_anonymous, created_at, updated_at)
on conflict (id) do nothing;

insert into public.profiles (id, username, first_name, last_name, email, role, status, platform_role) values
  ('40000000-0000-0000-0000-000000000001', 'platform', 'Platform', 'Admin', 'platform@example.com', 'person', 'active', 'platform_admin'),
  ('40000000-0000-0000-0000-000000000002', 'admina', 'Admin', 'A', 'admina@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000003', 'membera', 'Member', 'A', 'membera@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000004', 'adminb', 'Admin', 'B', 'adminb@example.com', 'person', 'active', 'user'),
  ('40000000-0000-0000-0000-000000000005', 'memberb', 'Member', 'B', 'memberb@example.com', 'person', 'active', 'user')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, username, role, status) values
  ('eeeeeee1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'admina', 'organization_admin', 'active'),
  ('eeeeeee1-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'membera', 'member', 'active'),
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

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);

select lives_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'harassment_or_bullying', 'Please review'); $$, :'activity_a_id'),
  'legitimate member can report an accessible activity'
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

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000005', true);

select throws_ok(
  format($$ select * from public.report_activity(%L, 'activity', 'other', null); $$, :'activity_a_id'),
  'P0001',
  'Activity not found.',
  'cross-tenant inaccessible activity cannot be reported'
);

select is(
  (select count(*)::integer from public.activity_reports),
  0,
  'unrelated user cannot enumerate reports'
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

select is(
  (select moderation_status from public.activities where id = :'activity_a_id'),
  'hidden'::public.activity_moderation_status,
  'hidden activity is marked hidden'
);

select throws_ok(
  format($$ select * from public.create_activity_qr_session(%L, 3600); $$, :'activity_a_id'),
  'P0001',
  'Activity is unavailable.',
  'hidden activity cannot generate a new QR'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*)::integer from public.activities where id = :'activity_a_id'),
  0,
  'hidden activity is not normally selectable'
);

select throws_ok(
  format($$ select * from public.scan_activity(%L); $$, :'qr_token_a'),
  'P0001',
  'Activity is unavailable.',
  'existing QR cannot create a new attendance entry after hide'
);

select is(
  (select count(*)::integer from public.activity_logs where activity_id = :'activity_a_id'),
  0,
  'moderation does not create or delete attendance logs'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

select lives_ok(
  format($$ select * from public.platform_restore_activity(%L); $$, :'activity_a_id'),
  'restore re-enables the intended activity access behavior'
);

select * from finish();

rollback;
