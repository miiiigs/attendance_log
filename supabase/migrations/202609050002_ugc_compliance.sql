-- Google Play UGC compliance: activity reporting and server-enforced hiding.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_moderation_status') then
    create type public.activity_moderation_status as enum ('visible', 'hidden');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_report_target') then
    create type public.activity_report_target as enum ('activity', 'organizer');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_report_reason') then
    create type public.activity_report_reason as enum (
      'harassment_or_bullying',
      'hate_or_abuse',
      'sexual_content',
      'violence_or_threats',
      'spam_or_scam',
      'illegal_or_harmful',
      'privacy_or_personal_information',
      'intellectual_property',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_report_status') then
    create type public.activity_report_status as enum ('pending', 'dismissed', 'actioned');
  end if;
end $$;

alter table public.activities
  add column if not exists moderation_status public.activity_moderation_status not null default 'visible',
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderation_reason text;

create table if not exists public.activity_reports (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  reported_creator_user_id uuid references public.profiles(id) on delete set null,
  target_type public.activity_report_target not null,
  reason public.activity_report_reason not null,
  details text,
  status public.activity_report_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  resolution text,
  constraint activity_reports_details_length check (details is null or length(details) <= 1000),
  constraint activity_reports_resolution_length check (resolution is null or length(resolution) <= 1000),
  constraint activity_reports_review_consistency check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index if not exists activity_reports_one_pending_per_target_idx
  on public.activity_reports (activity_id, reporter_user_id, target_type)
  where status = 'pending';

create index if not exists activity_reports_pending_created_idx
  on public.activity_reports (status, created_at desc);

create table if not exists public.user_blocks (
  blocker_user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint user_blocks_no_self_block check (blocker_user_id <> blocked_user_id)
);

create index if not exists user_blocks_blocked_user_idx
  on public.user_blocks (blocked_user_id);

alter table public.activity_reports enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "activity_reports_select_platform" on public.activity_reports;
create policy "activity_reports_select_platform"
on public.activity_reports
for select
to authenticated
using (public.is_platform_admin());

revoke all on table public.activity_reports from public;
revoke all on table public.activity_reports from anon;
revoke all on table public.activity_reports from authenticated;
grant select on table public.activity_reports to authenticated;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
on public.user_blocks
for select
to authenticated
using (blocker_user_id = auth.uid());

revoke all on table public.user_blocks from public;
revoke all on table public.user_blocks from anon;
revoke all on table public.user_blocks from authenticated;
grant select on table public.user_blocks to authenticated;

drop function if exists public.create_public_activity(text);

create or replace function public.create_public_activity(activity_name text, accepted_terms boolean default false)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles;
  verified_email text;
  result public.activities;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if accepted_terms is not true then
    raise exception 'You must agree to the Terms of Use and Acceptable Use Policy before creating an activity.';
  end if;

  if coalesce(btrim(activity_name), '') = '' then
    raise exception 'Activity name is required.';
  end if;

  verified_email := public.current_verified_auth_email();
  if verified_email is null then
    raise exception 'Create an account and verify your email to create activities.';
  end if;

  select * into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Only active users can create activities.';
  end if;

  insert into public.activities (
    organization_id,
    name,
    status,
    started_at,
    created_by,
    visibility
  )
  values (
    null,
    btrim(activity_name),
    'active',
    now(),
    current_user_id,
    'anyone_with_code'
  )
  returning * into result;

  return result;
end;
$$;

drop function if exists public.create_activity(text);
drop function if exists public.create_activity(text, uuid);
drop function if exists public.create_activity(text, uuid, public.activity_visibility);

create or replace function public.create_activity(
  activity_name text,
  target_organization_id uuid default null,
  visibility public.activity_visibility default 'community_only',
  accepted_terms boolean default false
)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_org_id uuid := coalesce(target_organization_id, public.get_default_organization_id());
  org_row public.organizations;
  resolved_visibility public.activity_visibility := coalesce(visibility, 'community_only');
  result public.activities;
begin
  if accepted_terms is not true then
    raise exception 'You must agree to the Terms of Use and Acceptable Use Policy before creating an activity.';
  end if;

  if resolved_org_id is null then
    raise exception 'No active organization context found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(resolved_org_id) then
    raise exception 'Only organization administrators can create activities.';
  end if;

  select * into org_row from public.organizations where id = resolved_org_id;
  if not found then
    raise exception 'Organization not found.';
  end if;

  if org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  if coalesce(btrim(activity_name), '') = '' then
    raise exception 'Activity name is required.';
  end if;

  begin
    insert into public.activities (
      organization_id,
      name,
      status,
      started_at,
      created_by,
      visibility
    )
    values (
      resolved_org_id,
      btrim(activity_name),
      'active',
      now(),
      auth.uid(),
      resolved_visibility
    )
    returning * into result;
  exception
    when unique_violation then
      raise exception 'An active activity already exists for this organization.';
  end;

  return result;
end;
$$;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select"
on public.activities
for select
to authenticated
using (
  public.is_platform_admin()
  or (
    moderation_status = 'visible'
    and (
      public.is_organization_admin(organization_id)
      or public.is_organization_member(organization_id)
      or public.has_activity_log(id)
      or created_by = auth.uid()
    )
    and not exists (
      select 1
      from public.user_blocks block
      where block.blocker_user_id = auth.uid()
        and block.blocked_user_id = activities.created_by
    )
  )
);

drop function if exists public.can_report_activity(uuid, uuid);

create or replace function public.can_report_activity(target_activity_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.activities activity
    where activity.id = target_activity_id
      and activity.moderation_status = 'visible'
      and (
        public.is_platform_admin()
        or activity.created_by = auth.uid()
        or public.is_organization_admin(activity.organization_id)
        or public.is_organization_member(activity.organization_id)
        or public.has_activity_log(activity.id)
      )
      and (
        public.is_platform_admin()
        or not exists (
          select 1
          from public.user_blocks block
          where block.blocker_user_id = auth.uid()
            and block.blocked_user_id = activity.created_by
        )
      )
  );
$$;

create or replace function public.report_activity(
  target_activity_id uuid,
  report_target text,
  report_reason text,
  report_details text default null
)
returns table (
  id uuid,
  status public.activity_report_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  activity_row public.activities;
  target_value public.activity_report_target;
  reason_value public.activity_report_reason;
  report_row public.activity_reports;
  normalized_details text := nullif(btrim(coalesce(report_details, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_activity_id is null then
    raise exception 'Activity id is required.';
  end if;

  begin
    target_value := report_target::public.activity_report_target;
  exception when invalid_text_representation then
    raise exception 'Invalid report target.';
  end;

  begin
    reason_value := report_reason::public.activity_report_reason;
  exception when invalid_text_representation then
    raise exception 'Invalid report reason.';
  end;

  if normalized_details is not null and length(normalized_details) > 1000 then
    raise exception 'Report details are too long.';
  end if;

  select *
  into activity_row
  from public.activities
  where public.activities.id = target_activity_id;

  if not found or activity_row.moderation_status <> 'visible' then
    raise exception 'Activity not found.';
  end if;

  if not public.can_report_activity(target_activity_id) then
    raise exception 'Activity not found.';
  end if;

  if target_value = 'organizer' and activity_row.created_by = current_user_id then
    raise exception 'You cannot report yourself as organizer.';
  end if;

  if target_value = 'organizer' and activity_row.created_by is null then
    raise exception 'Organizer is unavailable.';
  end if;

  insert into public.activity_reports (
    activity_id,
    reporter_user_id,
    reported_creator_user_id,
    target_type,
    reason,
    details
  )
  values (
    activity_row.id,
    current_user_id,
    activity_row.created_by,
    target_value,
    reason_value,
    normalized_details
  )
  on conflict (activity_id, reporter_user_id, target_type) where status = 'pending'
  do update set
    reason = excluded.reason,
    details = excluded.details,
    created_at = public.activity_reports.created_at
  returning * into report_row;

  return query
  select report_row.id, report_row.status, report_row.created_at;
end;
$$;

create or replace function public.platform_hide_activity_report(
  target_report_id uuid,
  moderator_note text default null
)
returns public.activity_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  report_row public.activity_reports;
  note text := nullif(btrim(coalesce(moderator_note, '')), '');
  moderation_timestamp timestamptz := now();
begin
  if current_user_id is null or not public.is_platform_admin() then
    raise exception 'Only platform administrators can moderate reports.';
  end if;

  if note is not null and length(note) > 1000 then
    raise exception 'Moderator note is too long.';
  end if;

  select * into report_row
  from public.activity_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'Report not found.';
  end if;

  with closed_logs as (
    update public.activity_logs
    set time_out = moderation_timestamp,
        updated_at = moderation_timestamp
    where activity_id = report_row.activity_id
      and time_out is null
      and exists (
        select 1
        from public.activities activity
        where activity.id = report_row.activity_id
          and activity.status = 'active'
      )
    returning organization_id, activity_id, membership_id, user_id
  )
  insert into public.activity_scans (
    organization_id,
    activity_id,
    membership_id,
    user_id,
    qr_session_id,
    scan_type,
    scanned_at
  )
  select
    organization_id,
    activity_id,
    membership_id,
    user_id,
    null,
    'time_out'::public.attendance_scan_type,
    moderation_timestamp
  from closed_logs;

  update public.activities
  set status = case when status = 'active' then 'ended'::public.activity_status else status end,
      ended_at = case when status = 'active' then moderation_timestamp else ended_at end,
      moderation_status = 'hidden',
      moderated_at = moderation_timestamp,
      moderated_by = current_user_id,
      moderation_reason = coalesce(note, 'Hidden after UGC report review.')
  where id = report_row.activity_id;

  update public.qr_sessions
  set status = 'revoked'
  where activity_id = report_row.activity_id
    and status = 'active';

  update public.activity_reports
  set status = 'actioned',
      reviewed_at = moderation_timestamp,
      reviewed_by = current_user_id,
      resolution = coalesce(note, 'Activity hidden.')
  where id = target_report_id
  returning * into report_row;

  return report_row;
end;
$$;

create or replace function public.platform_dismiss_activity_report(
  target_report_id uuid,
  moderator_note text default null
)
returns public.activity_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  report_row public.activity_reports;
  note text := nullif(btrim(coalesce(moderator_note, '')), '');
begin
  if current_user_id is null or not public.is_platform_admin() then
    raise exception 'Only platform administrators can moderate reports.';
  end if;

  if note is not null and length(note) > 1000 then
    raise exception 'Moderator note is too long.';
  end if;

  update public.activity_reports
  set status = 'dismissed',
      reviewed_at = now(),
      reviewed_by = current_user_id,
      resolution = coalesce(note, 'Dismissed after review.')
  where id = target_report_id
  returning * into report_row;

  if not found then
    raise exception 'Report not found.';
  end if;

  return report_row;
end;
$$;

create or replace function public.platform_restore_activity(target_activity_id uuid, moderator_note text default null)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  activity_row public.activities;
  note text := nullif(btrim(coalesce(moderator_note, '')), '');
begin
  if current_user_id is null or not public.is_platform_admin() then
    raise exception 'Only platform administrators can restore activities.';
  end if;

  if note is not null and length(note) > 1000 then
    raise exception 'Moderator note is too long.';
  end if;

  update public.activities
  set moderation_status = 'visible',
      moderated_at = now(),
      moderated_by = current_user_id,
      moderation_reason = coalesce(note, 'Restored after platform review.')
  where id = target_activity_id
  returning * into activity_row;

  if not found then
    raise exception 'Activity not found.';
  end if;

  return activity_row;
end;
$$;

create or replace function public.block_activity_organizer(target_activity_id uuid)
returns table (
  blocked_user_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  activity_row public.activities;
  block_row public.user_blocks;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_activity_id is null then
    raise exception 'Activity id is required.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id;

  if not found or activity_row.moderation_status <> 'visible' then
    raise exception 'Activity not found.';
  end if;

  if not public.can_report_activity(target_activity_id) then
    raise exception 'Activity not found.';
  end if;

  if activity_row.created_by is null then
    raise exception 'Organizer is unavailable.';
  end if;

  if activity_row.created_by = current_user_id then
    raise exception 'You cannot block yourself.';
  end if;

  insert into public.user_blocks (blocker_user_id, blocked_user_id)
  values (current_user_id, activity_row.created_by)
  on conflict (blocker_user_id, blocked_user_id)
  do update set created_at = public.user_blocks.created_at
  returning * into block_row;

  return query
  select block_row.blocked_user_id, block_row.created_at;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_user_id is null then
    raise exception 'User id is required.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot unblock yourself.';
  end if;

  delete from public.user_blocks
  where blocker_user_id = current_user_id
    and blocked_user_id = target_user_id;

  return true;
end;
$$;

create or replace function public.create_activity_qr_session(
  target_activity_id uuid,
  ttl_seconds integer default 18000
)
returns table (
  id uuid,
  token text,
  valid_from timestamptz,
  expires_at timestamptz,
  activity_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_token text;
  hashed_token text;
  session_row public.qr_sessions;
  activity_row public.activities;
  org_row public.organizations;
begin
  if target_activity_id is null then
    raise exception 'Activity id is required.';
  end if;

  select *
  into activity_row
  from public.activities
  where public.activities.id = target_activity_id
  for update;

  if not found then
    raise exception 'Activity not found.';
  end if;

  if activity_row.moderation_status <> 'visible' then
    raise exception 'Activity is unavailable.';
  end if;

  if activity_row.organization_id is null then
    if not public.is_platform_admin() and activity_row.created_by is distinct from auth.uid() then
      raise exception 'Only the activity creator can create activity QR codes.';
    end if;
  else
    if not public.is_platform_admin() and not public.is_organization_admin(activity_row.organization_id) then
      raise exception 'Only organization administrators can create activity QR codes.';
    end if;
  end if;

  if activity_row.status <> 'active' then
    raise exception 'Activity must be active to create a QR code.';
  end if;

  if activity_row.organization_id is not null then
    select * into org_row from public.organizations where public.organizations.id = activity_row.organization_id;
    if not found or org_row.status <> 'active' then
      raise exception 'Organization is not active.';
    end if;
  end if;

  if ttl_seconds < 60 or ttl_seconds > 43200 then
    raise exception 'QR TTL must be between 60 seconds and 12 hours.';
  end if;

  perform public.expire_old_qr_sessions();

  update public.qr_sessions
  set status = 'revoked'
  where public.qr_sessions.activity_id = target_activity_id
    and status = 'active';

  raw_token := encode(gen_random_bytes(24), 'hex');
  hashed_token := encode(digest(raw_token, 'sha256'), 'hex');

  insert into public.qr_sessions (
    token_hash,
    valid_from,
    expires_at,
    status,
    created_by,
    organization_id,
    activity_id
  )
  values (
    hashed_token,
    now(),
    now() + make_interval(secs => ttl_seconds),
    'active',
    auth.uid(),
    activity_row.organization_id,
    target_activity_id
  )
  returning * into session_row;

  return query
  select
    session_row.id,
    raw_token,
    session_row.valid_from,
    session_row.expires_at,
    session_row.activity_id;
end;
$$;

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
  session_row public.qr_sessions;
  activity_row public.activities;
  org_row public.organizations;
  log_row public.activity_logs;
  hashed_token text;
  participant_membership_id uuid;
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
  into activity_row
  from public.activities
  where id = session_row.activity_id
  for update;

  if not found or activity_row.status <> 'active' then
    raise exception 'Activity has ended.';
  end if;

  if activity_row.moderation_status <> 'visible' then
    raise exception 'Activity is unavailable.';
  end if;

  if exists (
    select 1
    from public.user_blocks block
    where block.blocker_user_id = current_user_id
      and block.blocked_user_id = activity_row.created_by
  ) then
    raise exception 'Activity is unavailable.';
  end if;

  participant_membership_id := null;

  if activity_row.organization_id is not null then
    select *
    into org_row
    from public.organizations
    where id = activity_row.organization_id;

    if not found or org_row.status <> 'active' then
      raise exception 'Organization is not active.';
    end if;

    select membership.id
    into participant_membership_id
    from public.organization_memberships membership
    where membership.user_id = current_user_id
      and membership.organization_id = activity_row.organization_id
      and membership.status = 'active'
    order by
      case when membership.role = 'organization_admin' then 0 else 1 end,
      membership.created_at asc
    limit 1
    for update;

    if participant_membership_id is null and activity_row.visibility = 'community_only' then
      raise exception 'This activity is for Community members only.';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || activity_row.id::text, 0));

  select *
  into log_row
  from public.activity_logs
  where public.activity_logs.activity_id = activity_row.id
    and public.activity_logs.user_id = current_user_id
  for update;

  if not found then
    insert into public.activity_logs (
      organization_id,
      activity_id,
      membership_id,
      user_id,
      time_in,
      time_out
    )
    values (
      activity_row.organization_id,
      activity_row.id,
      participant_membership_id,
      current_user_id,
      scan_timestamp,
      null
    )
    returning * into log_row;

    insert into public.activity_scans (
      organization_id,
      activity_id,
      membership_id,
      user_id,
      qr_session_id,
      scan_type,
      scanned_at
    )
    values (
      activity_row.organization_id,
      activity_row.id,
      participant_membership_id,
      current_user_id,
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

revoke all on function public.can_report_activity(uuid) from public;
revoke all on function public.can_report_activity(uuid) from anon;
revoke all on function public.can_report_activity(uuid) from authenticated;

revoke all on function public.create_public_activity(text, boolean) from public;
revoke all on function public.create_public_activity(text, boolean) from anon;
grant execute on function public.create_public_activity(text, boolean) to authenticated;

revoke all on function public.create_activity(text, uuid, public.activity_visibility, boolean) from public;
revoke all on function public.create_activity(text, uuid, public.activity_visibility, boolean) from anon;
grant execute on function public.create_activity(text, uuid, public.activity_visibility, boolean) to authenticated;

revoke all on function public.report_activity(uuid, text, text, text) from public;
revoke all on function public.report_activity(uuid, text, text, text) from anon;
grant execute on function public.report_activity(uuid, text, text, text) to authenticated;

revoke all on function public.block_activity_organizer(uuid) from public;
revoke all on function public.block_activity_organizer(uuid) from anon;
grant execute on function public.block_activity_organizer(uuid) to authenticated;

revoke all on function public.unblock_user(uuid) from public;
revoke all on function public.unblock_user(uuid) from anon;
grant execute on function public.unblock_user(uuid) to authenticated;

revoke all on function public.platform_hide_activity_report(uuid, text) from public;
revoke all on function public.platform_hide_activity_report(uuid, text) from anon;
grant execute on function public.platform_hide_activity_report(uuid, text) to authenticated;

revoke all on function public.platform_dismiss_activity_report(uuid, text) from public;
revoke all on function public.platform_dismiss_activity_report(uuid, text) from anon;
grant execute on function public.platform_dismiss_activity_report(uuid, text) to authenticated;

revoke all on function public.platform_restore_activity(uuid, text) from public;
revoke all on function public.platform_restore_activity(uuid, text) from anon;
grant execute on function public.platform_restore_activity(uuid, text) to authenticated;
