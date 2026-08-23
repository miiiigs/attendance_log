-- Release hardening for the Supabase Data API surface and advisor findings.

-- ---------------------------------------------------------------------------
-- 1. trigger helper hardening
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. lock down internal username counters
-- ---------------------------------------------------------------------------
alter table public.organization_username_counters enable row level security;

revoke all on table public.organization_username_counters from public;
revoke all on table public.organization_username_counters from anon;
revoke all on table public.organization_username_counters from authenticated;

-- ---------------------------------------------------------------------------
-- 3. explicit Data API grants for activity-era tables
--
-- Activities and QR sessions are read directly by authenticated clients, but
-- all writes should flow through the vetted SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
revoke all on table public.activities from public;
revoke all on table public.activity_logs from public;
revoke all on table public.activity_scans from public;
revoke all on table public.qr_sessions from public;

revoke all on table public.activities from anon;
revoke all on table public.activity_logs from anon;
revoke all on table public.activity_scans from anon;
revoke all on table public.qr_sessions from anon;

revoke all on table public.activities from authenticated;
revoke all on table public.activity_logs from authenticated;
revoke all on table public.activity_scans from authenticated;
revoke all on table public.qr_sessions from authenticated;

grant select on table public.activities to authenticated;
grant select on table public.activity_logs to authenticated;
grant select on table public.qr_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- 4. explicit function execute surface
--
-- Revoke default PUBLIC exposure first, then grant back only the roles the
-- application actually needs.
-- ---------------------------------------------------------------------------
revoke all on function public.admin_force_time_out(date, uuid[]) from public;
revoke all on function public.admin_revert_time_out(date, uuid[]) from public;
revoke all on function public.can_modify_global_profile(uuid) from public;
revoke all on function public.can_read_global_profile(uuid) from public;
revoke all on function public.create_activity(text) from public;
revoke all on function public.create_activity_qr_session(uuid, integer) from public;
revoke all on function public.create_qr_session(integer) from public;
revoke all on function public.delete_qr_session(uuid) from public;
revoke all on function public.end_activity(uuid) from public;
revoke all on function public.expire_old_qr_sessions() from public;
revoke all on function public.generate_next_membership_username(uuid, integer) from public;
revoke all on function public.generate_next_username(integer) from public;
revoke all on function public.get_default_organization_id(uuid) from public;
revoke all on function public.get_own_membership_id(uuid) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_organization_admin(uuid) from public;
revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_platform_admin() from public;
revoke all on function public.revoke_qr_session(uuid) from public;
revoke all on function public.scan_activity(text) from public;
revoke all on function public.scan_attendance(text) from public;
revoke all on function public.self_time_out() from public;

revoke all on function public.admin_force_time_out(date, uuid[]) from anon;
revoke all on function public.admin_revert_time_out(date, uuid[]) from anon;
revoke all on function public.can_modify_global_profile(uuid) from anon;
revoke all on function public.can_read_global_profile(uuid) from anon;
revoke all on function public.create_activity(text) from anon;
revoke all on function public.create_activity_qr_session(uuid, integer) from anon;
revoke all on function public.create_qr_session(integer) from anon;
revoke all on function public.delete_qr_session(uuid) from anon;
revoke all on function public.end_activity(uuid) from anon;
revoke all on function public.expire_old_qr_sessions() from anon;
revoke all on function public.generate_next_membership_username(uuid, integer) from anon;
revoke all on function public.generate_next_username(integer) from anon;
revoke all on function public.get_default_organization_id(uuid) from anon;
revoke all on function public.get_own_membership_id(uuid) from anon;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_organization_admin(uuid) from anon;
revoke all on function public.is_organization_member(uuid) from anon;
revoke all on function public.is_platform_admin() from anon;
revoke all on function public.revoke_qr_session(uuid) from anon;
revoke all on function public.scan_activity(text) from anon;
revoke all on function public.scan_attendance(text) from anon;
revoke all on function public.self_time_out() from anon;

revoke all on function public.expire_old_qr_sessions() from authenticated;
revoke all on function public.generate_next_username(integer) from authenticated;
revoke all on function public.get_default_organization_id(uuid) from authenticated;
revoke all on function public.is_admin() from authenticated;

grant execute on function public.admin_force_time_out(date, uuid[]) to authenticated;
grant execute on function public.admin_revert_time_out(date, uuid[]) to authenticated;
grant execute on function public.can_modify_global_profile(uuid) to authenticated;
grant execute on function public.can_read_global_profile(uuid) to authenticated;
grant execute on function public.create_activity(text) to authenticated;
grant execute on function public.create_activity_qr_session(uuid, integer) to authenticated;
grant execute on function public.create_qr_session(integer) to authenticated;
grant execute on function public.delete_qr_session(uuid) to authenticated;
grant execute on function public.end_activity(uuid) to authenticated;
grant execute on function public.generate_next_membership_username(uuid, integer) to authenticated;
grant execute on function public.get_own_membership_id(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.revoke_qr_session(uuid) to authenticated;
grant execute on function public.scan_activity(text) to authenticated;
grant execute on function public.scan_attendance(text) to authenticated;
grant execute on function public.self_time_out() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. low-risk supporting indexes for advisor-reported foreign keys
-- ---------------------------------------------------------------------------
create index if not exists attendance_scans_qr_session_idx
  on public.attendance_scans (qr_session_id);

create index if not exists organization_applications_reviewed_by_idx
  on public.organization_applications (reviewed_by);

create index if not exists organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create index if not exists organizations_approved_by_idx
  on public.organizations (approved_by);

create index if not exists qr_sessions_created_by_idx
  on public.qr_sessions (created_by);

-- ---------------------------------------------------------------------------
-- 6. narrow RLS initplan optimizations
-- ---------------------------------------------------------------------------
drop policy if exists "organization_memberships_select_scoped" on public.organization_memberships;
create policy "organization_memberships_select_scoped"
on public.organization_memberships
for select
to authenticated
using (
  (select public.is_platform_admin())
  or user_id = (select auth.uid())
  or public.is_organization_admin(organization_id)
);

drop policy if exists "profiles_self_or_admin_select" on public.profiles;
create policy "profiles_self_or_admin_select"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_platform_admin())
  or public.can_read_global_profile(id)
);

drop policy if exists "attendance_records_self_or_admin_select" on public.attendance_records;
create policy "attendance_records_self_or_admin_select"
on public.attendance_records
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_platform_admin())
  or public.is_organization_admin(organization_id)
);

drop policy if exists "attendance_scans_self_or_admin_select" on public.attendance_scans;
create policy "attendance_scans_self_or_admin_select"
on public.attendance_scans
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_platform_admin())
  or public.is_organization_admin(organization_id)
);
