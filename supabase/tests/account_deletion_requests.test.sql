begin;

create extension if not exists pgtap;

select plan(14);

select has_table('public', 'account_deletion_requests', 'account deletion request table exists');
select has_column('public', 'account_deletion_requests', 'normalized_email', 'stores normalized email only');
select has_column('public', 'account_deletion_requests', 'status', 'stores operator workflow status');
select has_column('public', 'account_deletion_requests', 'source', 'stores request source');
select has_column('public', 'account_deletion_requests', 'processed_at', 'stores processing timestamp');

select is(
  (select relrowsecurity from pg_class where oid = 'public.account_deletion_requests'::regclass),
  true,
  'account_deletion_requests has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.account_deletion_requests', 'select'),
  'anon cannot select deletion requests directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.account_deletion_requests', 'select'),
  'authenticated users cannot select deletion requests directly'
);

select ok(
  not has_table_privilege('anon', 'public.account_deletion_requests', 'insert'),
  'anon cannot insert deletion requests directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.account_deletion_requests', 'insert'),
  'authenticated users cannot insert deletion requests directly'
);

select ok(
  has_table_privilege('service_role', 'public.account_deletion_requests', 'insert'),
  'service_role can insert deletion requests for the server-side request endpoint'
);

select lives_ok(
  $$ insert into public.account_deletion_requests (normalized_email, source) values ('local-user@example.com', 'web'); $$,
  'trusted server/service pathway can insert a deletion request'
);

select throws_ok(
  $$ insert into public.account_deletion_requests (normalized_email, source) values ('LOCAL-USER@example.com', 'web'); $$,
  '23514',
  'deletion request email must be normalized'
);

select has_table('public', 'activity_logs', 'existing activity log table remains present');

rollback;
