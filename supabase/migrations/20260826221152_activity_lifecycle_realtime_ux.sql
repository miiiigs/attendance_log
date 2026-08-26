-- ============================================================================
-- Activity lifecycle revision + realtime publication updates
--
-- Changes:
--   * scan_activity becomes time-in only
--   * leave_activity adds manual member time-out for activity_logs
--   * end_activity auto-completes still-open participants with the same
--     timestamp used for activities.ended_at
--   * supabase_realtime publication gains the tenant-scoped tables needed for
--     low-frequency invalidation subscriptions
--   * function grants are re-applied explicitly for SECURITY DEFINER safety
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Activity scan lifecycle: QR is time-in only
-- ---------------------------------------------------------------------------
create or replace function public.scan_activity(qr_token text)
returns table (
  activity_log_id uuid,
  activity_id uuid,
  activity_name text,
  scan_type public.attendance_scan_type,
  scanned_at timestamptz,
  time_in timestamptz,
  time_out timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  scan_timestamp timestamptz := now();
  profile_row public.profiles;
  membership_row public.organization_memberships;
  session_row public.qr_sessions;
  activity_row public.activities;
  org_row public.organizations;
  log_row public.activity_logs;
  hashed_token text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(qr_token), '') = '' then
    raise exception 'Invalid attendance QR.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Your account is inactive.';
  end if;

  perform public.expire_old_qr_sessions();
  hashed_token := encode(digest(qr_token, 'sha256'), 'hex');

  select *
  into session_row
  from public.qr_sessions
  where token_hash = hashed_token
    and status = 'active'
    and valid_from <= scan_timestamp
    and expires_at >= scan_timestamp
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'QR code has expired.';
  end if;

  if session_row.activity_id is null then
    raise exception 'QR code is not linked to an activity.';
  end if;

  select *
  into membership_row
  from public.organization_memberships
  where user_id = current_user_id
    and organization_id = session_row.organization_id
    and status = 'active'
  order by
    case when role = 'organization_admin' then 0 else 1 end,
    created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'QR code does not belong to your organization.';
  end if;

  select *
  into org_row
  from public.organizations
  where id = membership_row.organization_id;

  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = session_row.activity_id
  for update;

  if not found or activity_row.status <> 'active' then
    raise exception 'Activity has ended.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(membership_row.id::text || ':' || activity_row.id::text, 0));

  select *
  into log_row
  from public.activity_logs
  where public.activity_logs.activity_id = activity_row.id
    and public.activity_logs.membership_id = membership_row.id
  for update;

  if not found then
    insert into public.activity_logs (
      organization_id,
      activity_id,
      membership_id,
      time_in,
      time_out
    )
    values (
      membership_row.organization_id,
      activity_row.id,
      membership_row.id,
      scan_timestamp,
      null
    )
    returning * into log_row;

    insert into public.activity_scans (
      organization_id,
      activity_id,
      membership_id,
      qr_session_id,
      scan_type,
      scanned_at
    )
    values (
      membership_row.organization_id,
      activity_row.id,
      membership_row.id,
      session_row.id,
      'time_in'::public.attendance_scan_type,
      scan_timestamp
    );

    return query
    select
      log_row.id,
      activity_row.id,
      activity_row.name,
      'time_in'::public.attendance_scan_type,
      scan_timestamp,
      log_row.time_in,
      log_row.time_out,
      'Time in recorded successfully.';

    return;
  end if;

  if log_row.time_out is null then
    raise exception 'You are already timed in to this activity. Use Leave Activity when you are ready to leave.';
  end if;

  raise exception 'Activity already completed.';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Manual member completion for activities
-- ---------------------------------------------------------------------------
create or replace function public.leave_activity(target_activity_id uuid)
returns table (
  activity_log_id uuid,
  activity_id uuid,
  activity_name text,
  time_in timestamptz,
  time_out timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  action_timestamp timestamptz := now();
  profile_row public.profiles;
  activity_row public.activities;
  membership_row public.organization_memberships;
  org_row public.organizations;
  log_row public.activity_logs;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_activity_id is null then
    raise exception 'Activity id is required.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Only active members can leave an activity.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'Activity not found.';
  end if;

  select *
  into membership_row
  from public.organization_memberships
  where user_id = current_user_id
    and organization_id = activity_row.organization_id
    and status = 'active'
  order by
    case when role = 'organization_admin' then 0 else 1 end,
    created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'You are not a member of this organization.';
  end if;

  select *
  into org_row
  from public.organizations
  where id = activity_row.organization_id;

  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(membership_row.id::text || ':' || activity_row.id::text, 0));

  select *
  into log_row
  from public.activity_logs
  where public.activity_logs.activity_id = activity_row.id
    and public.activity_logs.membership_id = membership_row.id
  for update;

  if not found or log_row.time_in is null then
    raise exception 'You are not currently timed in to this activity.';
  end if;

  if log_row.time_out is null then
    update public.activity_logs
    set time_out = action_timestamp
    where id = log_row.id
      and public.activity_logs.time_out is null
    returning * into log_row;

    if not found then
      select *
      into log_row
      from public.activity_logs
      where public.activity_logs.activity_id = activity_row.id
        and public.activity_logs.membership_id = membership_row.id;
    end if;

    return query
    select
      log_row.id,
      activity_row.id,
      activity_row.name,
      log_row.time_in,
      log_row.time_out,
      'You have left the activity successfully.';

    return;
  end if;

  return query
  select
    log_row.id,
    activity_row.id,
    activity_row.name,
    log_row.time_in,
    log_row.time_out,
    'Activity already completed.';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Ending an activity auto-completes still-open participants
-- ---------------------------------------------------------------------------
create or replace function public.end_activity(target_activity_id uuid)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_row public.activities;
  activity_end_timestamp timestamptz := now();
begin
  if target_activity_id is null then
    raise exception 'Activity id is required.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'Activity not found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(activity_row.organization_id) then
    raise exception 'Only organization administrators can end activities.';
  end if;

  if activity_row.status <> 'active' then
    raise exception 'Activity is not active.';
  end if;

  update public.activity_logs
  set time_out = activity_end_timestamp
  where activity_id = target_activity_id
    and time_in is not null
    and time_out is null;

  update public.qr_sessions
  set status = 'revoked'
  where activity_id = target_activity_id
    and status = 'active';

  update public.activities
  set status = 'ended',
      ended_at = activity_end_timestamp
  where id = target_activity_id
  returning * into activity_row;

  return activity_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Realtime publication entries for targeted invalidation
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'activities'
    ) then
      alter publication supabase_realtime add table public.activities;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'activity_logs'
    ) then
      alter publication supabase_realtime add table public.activity_logs;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'organization_memberships'
    ) then
      alter publication supabase_realtime add table public.organization_memberships;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'qr_sessions'
    ) then
      alter publication supabase_realtime add table public.qr_sessions;
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants for SECURITY DEFINER activity RPCs
-- ---------------------------------------------------------------------------
revoke all on function public.leave_activity(uuid) from public;
revoke all on function public.leave_activity(uuid) from anon;
revoke all on function public.leave_activity(uuid) from authenticated;
grant execute on function public.leave_activity(uuid) to authenticated;

revoke all on function public.end_activity(uuid) from public;
revoke all on function public.end_activity(uuid) from anon;
grant execute on function public.end_activity(uuid) to authenticated;

revoke all on function public.scan_activity(text) from public;
revoke all on function public.scan_activity(text) from anon;
grant execute on function public.scan_activity(text) to authenticated;
