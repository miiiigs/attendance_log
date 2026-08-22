-- ============================================================================
-- Activity Log multi-tenant foundation
--
-- Builds on 202608180001_multitenant_platform_foundation (organizations,
-- organization_memberships, organization_username_counters, platform admin,
-- SCPPA backfill, org-scoped RLS on org tables).
--
-- Adds:
--   * activities (one active Activity per organization, DB-enforced)
--   * activity_logs (participant logs keyed by activity + membership)
--   * activity_scans (audit trail for activity scans)
--   * qr_sessions -> activity association (additive, nullable for legacy)
--   * activity RPCs (create/end Activity, activity QR, scan_activity)
--   * org-scoped repair of legacy RPCs that broke when organization_id
--     became NOT NULL (create_qr_session, scan_attendance, self_time_out,
--     admin_force_time_out, admin_revert_time_out, revoke/delete_qr_session)
--   * tenant-aware RLS hardening on legacy tenant tables
--
-- Forward-only and idempotent so `supabase db reset` replays cleanly.
-- Legacy attendance history (attendance_records / attendance_scans) is
-- preserved unchanged; no synthetic historical Activities are fabricated.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'activity_status'
  ) then
    create type public.activity_status as enum ('active', 'ended');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. structural cross-tenant keys on existing tables
-- ---------------------------------------------------------------------------
create unique index if not exists organization_memberships_id_org_uidx
  on public.organization_memberships (id, organization_id);

create unique index if not exists qr_sessions_id_org_uidx
  on public.qr_sessions (id, organization_id);

-- ---------------------------------------------------------------------------
-- 3. activities
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  status public.activity_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_name_not_blank check (btrim(name) <> ''),
  constraint activities_name_length check (length(btrim(name)) <= 200),
  constraint activities_active_has_no_end check (
    (status = 'active' and ended_at is null)
    or (status = 'ended' and ended_at is not null)
  )
);

-- Only one active Activity per organization, enforced at the DB level.
create unique index if not exists activities_one_active_per_org_uidx
  on public.activities (organization_id)
  where status = 'active';

-- Composite unique key used as a composite FK target for org consistency.
create unique index if not exists activities_id_org_uidx
  on public.activities (id, organization_id);

create index if not exists activities_org_created_idx
  on public.activities (organization_id, created_at desc);

create index if not exists activities_org_status_created_idx
  on public.activities (organization_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. activity_logs
-- ---------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  activity_id uuid not null,
  membership_id uuid not null,
  time_in timestamptz not null,
  time_out timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_logs_activity_org_fk
    foreign key (activity_id, organization_id)
    references public.activities (id, organization_id),
  constraint activity_logs_membership_org_fk
    foreign key (membership_id, organization_id)
    references public.organization_memberships (id, organization_id),
  constraint activity_logs_time_order check (time_out is null or time_out >= time_in),
  constraint activity_logs_activity_membership_uq unique (activity_id, membership_id)
);

create index if not exists activity_logs_org_created_idx
  on public.activity_logs (organization_id, created_at desc);

create index if not exists activity_logs_membership_activity_idx
  on public.activity_logs (membership_id, activity_id);

-- ---------------------------------------------------------------------------
-- 5. activity_scans (audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  activity_id uuid not null,
  membership_id uuid not null,
  qr_session_id uuid references public.qr_sessions (id) on delete set null,
  scan_type public.attendance_scan_type not null,
  scanned_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint activity_scans_activity_org_fk
    foreign key (activity_id, organization_id)
    references public.activities (id, organization_id),
  constraint activity_scans_membership_org_fk
    foreign key (membership_id, organization_id)
    references public.organization_memberships (id, organization_id)
);

create index if not exists activity_scans_org_scanned_idx
  on public.activity_scans (organization_id, scanned_at desc);

create index if not exists activity_scans_activity_membership_idx
  on public.activity_scans (activity_id, membership_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- 6. qr_sessions -> activity association (additive, legacy sessions nullable)
-- ---------------------------------------------------------------------------
alter table public.qr_sessions
  add column if not exists activity_id uuid;

alter table public.qr_sessions
  drop constraint if exists qr_sessions_activity_org_fk;

alter table public.qr_sessions
  add constraint qr_sessions_activity_org_fk
    foreign key (activity_id, organization_id)
    references public.activities (id, organization_id);

create index if not exists qr_sessions_activity_status_idx
  on public.qr_sessions (activity_id, status, expires_at desc);

-- ---------------------------------------------------------------------------
-- 7. authorization helpers (security definer, explicit search_path)
-- ---------------------------------------------------------------------------
create or replace function public.get_own_membership_id(target_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.organization_memberships
  where user_id = auth.uid()
    and organization_id = target_organization_id
    and status = 'active'
  limit 1;
$$;

-- True when the caller may read the global profile of target_user_id:
-- platform admin, or an active organization admin of any org where the
-- target user has an active membership.
create or replace function public.can_read_global_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.organization_memberships target_m
      where target_m.user_id = target_user_id
        and target_m.status = 'active'
        and public.is_organization_admin(target_m.organization_id)
    );
$$;

-- True when the caller may modify the global profile of target_user_id.
create or replace function public.can_modify_global_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.organization_memberships target_m
      where target_m.user_id = target_user_id
        and target_m.status = 'active'
        and public.is_organization_admin(target_m.organization_id)
    );
$$;

-- ---------------------------------------------------------------------------
-- 8. activity RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_activity(activity_name text)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid := public.get_default_organization_id();
  org_row public.organizations;
  result public.activities;
begin
  if target_org_id is null then
    raise exception 'No active organization context found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(target_org_id) then
    raise exception 'Only organization administrators can create activities.';
  end if;

  select * into org_row from public.organizations where id = target_org_id;
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
      created_by
    )
    values (
      target_org_id,
      btrim(activity_name),
      'active',
      now(),
      auth.uid()
    )
    returning * into result;
  exception
    when unique_violation then
      raise exception 'An active activity already exists for this organization.';
  end;

  return result;
end;
$$;

create or replace function public.end_activity(target_activity_id uuid)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_row public.activities;
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

  update public.qr_sessions
  set status = 'revoked'
  where activity_id = target_activity_id
    and status = 'active';

  update public.activities
  set status = 'ended',
      ended_at = now()
  where id = target_activity_id
  returning * into activity_row;

  return activity_row;
end;
$$;

-- Replacement QR semantics: a new QR for the same Activity revokes that
-- Activity's previous active sessions only (org-scoped, never cross-tenant).
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

  if not public.is_platform_admin() and not public.is_organization_admin(activity_row.organization_id) then
    raise exception 'Only organization administrators can create activity QR codes.';
  end if;

  if activity_row.status <> 'active' then
    raise exception 'Activity must be active to create a QR code.';
  end if;

  select * into org_row from public.organizations where public.organizations.id = activity_row.organization_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
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

-- Activity scan state machine. Concurrency key is (activity_id, membership_id).
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
  membership_row public.organization_memberships;
  session_row public.qr_sessions;
  activity_row public.activities;
  org_row public.organizations;
  log_row public.activity_logs;
  scan_kind public.attendance_scan_type;
  hashed_token text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(qr_token), '') = '' then
    raise exception 'Invalid attendance QR.';
  end if;

  select *
  into membership_row
  from public.organization_memberships
  where user_id = current_user_id
    and status = 'active'
  order by
    case when role = 'organization_admin' then 0 else 1 end,
    created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No active organization membership found.';
  end if;

  select * into org_row from public.organizations where id = membership_row.organization_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
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

  if session_row.organization_id is distinct from membership_row.organization_id then
    raise exception 'QR code does not belong to your organization.';
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

    scan_kind := 'time_in';
  elsif log_row.time_out is null then
    update public.activity_logs
    set time_out = scan_timestamp
    where id = log_row.id
    returning * into log_row;

    scan_kind := 'time_out';
  else
    raise exception 'Activity already completed.';
  end if;

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
    scan_kind,
    scan_timestamp
  );

  return query
  select
    log_row.id,
    activity_row.id,
    activity_row.name,
    scan_kind,
    scan_timestamp,
    log_row.time_in,
    log_row.time_out,
    case
      when scan_kind = 'time_in' then 'Time in recorded successfully.'
      else 'Time out recorded successfully.'
    end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. legacy RPC org-scoping repair
--
-- The multitenant foundation made qr_sessions/attendance_records/
-- attendance_scans.organization_id NOT NULL but did not update the legacy
-- RPCs. Without these repairs the existing web/mobile flows (QR generation,
-- mobile scan, manual time out) fail on the new NOT NULL column.
-- Each legacy function now resolves the caller's default organization and
-- scopes all reads/writes + QR validation to it (fails closed).
-- ---------------------------------------------------------------------------
create or replace function public.create_qr_session(ttl_seconds integer default 43200)
returns table (
  id uuid,
  token text,
  valid_from timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_org_id uuid := public.get_default_organization_id();
  org_row public.organizations;
  raw_token text := encode(gen_random_bytes(24), 'hex');
  hashed_token text := encode(digest(raw_token, 'sha256'), 'hex');
  session_row public.qr_sessions;
begin
  if target_org_id is null then
    raise exception 'No active organization context found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(target_org_id) then
    raise exception 'Only admins can create attendance QR codes.';
  end if;

  select * into org_row from public.organizations where id = target_org_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  if ttl_seconds < 60 or ttl_seconds > 43200 then
    raise exception 'QR TTL must be between 60 seconds and 12 hours.';
  end if;

  perform public.expire_old_qr_sessions();

  update public.qr_sessions
  set status = 'revoked'
  where status = 'active'
    and organization_id = target_org_id;

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
    current_user_id,
    target_org_id,
    null
  )
  returning * into session_row;

  return query
  select session_row.id, raw_token, session_row.valid_from, session_row.expires_at;
end;
$$;

create or replace function public.revoke_qr_session(session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.qr_sessions;
begin
  select * into session_row from public.qr_sessions where id = session_id;
  if not found then
    return;
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(session_row.organization_id) then
    raise exception 'Only admins can revoke attendance QR codes.';
  end if;

  update public.qr_sessions
  set status = 'revoked'
  where id = session_id
    and status = 'active';
end;
$$;

create or replace function public.delete_qr_session(session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.qr_sessions;
begin
  select * into session_row from public.qr_sessions where id = session_id;
  if not found then
    return;
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(session_row.organization_id) then
    raise exception 'Only admins can delete attendance QR codes.';
  end if;

  delete from public.qr_sessions where id = session_id;
end;
$$;

-- Legacy daily attendance scan, preserved for compatibility. Organization and
-- attendance date are resolved from the caller's active membership.
create or replace function public.scan_attendance(qr_token text)
returns table (
  attendance_record_id uuid,
  attendance_date date,
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
  org_row public.organizations;
  session_row public.qr_sessions;
  record_row public.attendance_records;
  scan_kind public.attendance_scan_type;
  hashed_token text;
  org_date date;
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

  if not found then
    raise exception 'Profile not found.';
  end if;

  if profile_row.role <> 'person' then
    raise exception 'Only person accounts can scan attendance.';
  end if;

  if profile_row.status <> 'active' then
    raise exception 'Your account is inactive.';
  end if;

  select *
  into membership_row
  from public.organization_memberships
  where user_id = current_user_id
    and status = 'active'
  order by
    case when role = 'organization_admin' then 0 else 1 end,
    created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No active organization membership found.';
  end if;

  select * into org_row from public.organizations where id = membership_row.organization_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  org_date := (scan_timestamp at time zone org_row.timezone)::date;

  perform pg_advisory_xact_lock(hashtextextended(
    membership_row.organization_id::text || ':' || current_user_id::text || ':' || org_date::text,
    0
  ));

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

  if session_row.organization_id is distinct from membership_row.organization_id then
    raise exception 'QR code does not belong to your organization.';
  end if;

  select ar.*
  into record_row
  from public.attendance_records ar
  where ar.user_id = current_user_id
    and ar.attendance_date = org_date
    and ar.organization_id = membership_row.organization_id
  for update;

  if not found then
    insert into public.attendance_records (
      user_id,
      attendance_date,
      time_in,
      time_out,
      organization_id
    )
    values (
      current_user_id,
      org_date,
      scan_timestamp,
      null,
      membership_row.organization_id
    )
    returning * into record_row;

    scan_kind := 'time_in';
  elsif record_row.time_in is not null and record_row.time_out is null then
    update public.attendance_records
    set time_out = scan_timestamp
    where id = record_row.id
    returning * into record_row;

    scan_kind := 'time_out';
  else
    raise exception 'Attendance already completed for today.';
  end if;

  insert into public.attendance_scans (
    user_id,
    attendance_record_id,
    qr_session_id,
    scan_type,
    scanned_at,
    organization_id
  )
  values (
    current_user_id,
    record_row.id,
    session_row.id,
    scan_kind,
    scan_timestamp,
    membership_row.organization_id
  );

  return query
  select
    record_row.id,
    record_row.attendance_date,
    scan_kind,
    scan_timestamp,
    record_row.time_in,
    record_row.time_out,
    case
      when scan_kind = 'time_in' then 'Time in recorded successfully.'
      else 'Time out recorded successfully.'
    end;
end;
$$;

create or replace function public.self_time_out()
returns table (
  attendance_record_id uuid,
  attendance_date date,
  scan_type public.attendance_scan_type,
  scanned_at timestamptz,
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
  membership_row public.organization_memberships;
  org_row public.organizations;
  record_row public.attendance_records;
  org_date date;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to record a time out.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Only active users can record a time out.';
  end if;

  select *
  into membership_row
  from public.organization_memberships
  where user_id = current_user_id
    and status = 'active'
  order by
    case when role = 'organization_admin' then 0 else 1 end,
    created_at asc
  limit 1;

  if not found then
    raise exception 'No active organization membership found.';
  end if;

  select * into org_row from public.organizations where id = membership_row.organization_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  org_date := (action_timestamp at time zone org_row.timezone)::date;

  select ar.*
  into record_row
  from public.attendance_records ar
  where ar.user_id = current_user_id
    and ar.attendance_date = org_date
    and ar.organization_id = membership_row.organization_id
  for update;

  if not found or record_row.time_in is null then
    raise exception 'No time in record was found for today.';
  end if;

  if record_row.time_out is not null then
    raise exception 'Attendance already completed for today.';
  end if;

  update public.attendance_records ar
  set time_out = action_timestamp
  where ar.id = record_row.id
  returning * into record_row;

  insert into public.attendance_scans (
    user_id,
    attendance_record_id,
    qr_session_id,
    scan_type,
    scanned_at,
    organization_id
  )
  values (
    current_user_id,
    record_row.id,
    null,
    'time_out'::public.attendance_scan_type,
    action_timestamp,
    membership_row.organization_id
  );

  return query
  select
    record_row.id,
    record_row.attendance_date,
    'time_out'::public.attendance_scan_type,
    action_timestamp,
    record_row.time_in,
    record_row.time_out,
    'Time out recorded successfully.';
end;
$$;

create or replace function public.admin_force_time_out(
  target_date date,
  target_user_ids uuid[] default null
)
returns table (
  attendance_record_id uuid,
  user_id uuid,
  scanned_at timestamptz,
  attendance_date date,
  time_in timestamptz,
  time_out timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  action_timestamp timestamptz := now();
  caller_org_id uuid := public.get_default_organization_id();
  org_row public.organizations;
  org_date date;
begin
  if caller_org_id is null then
    raise exception 'No active organization context found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(caller_org_id) then
    raise exception 'Only admins can manually time out attendance.';
  end if;

  select * into org_row from public.organizations where id = caller_org_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  org_date := (action_timestamp at time zone org_row.timezone)::date;

  if target_date <> org_date then
    raise exception 'Bulk time out is only available for the current attendance date.';
  end if;

  return query
  with target_rows as (
    select
      ar.id as record_id,
      ar.user_id as target_user_id,
      ar.attendance_date as target_attendance_date,
      ar.time_in as target_time_in
    from public.attendance_records ar
    join public.organization_memberships membership
      on membership.user_id = ar.user_id
      and membership.organization_id = caller_org_id
    join public.profiles p on p.id = ar.user_id
    where ar.attendance_date = target_date
      and ar.organization_id = caller_org_id
      and membership.status = 'active'
      and ar.time_in is not null
      and ar.time_out is null
      and p.status = 'active'
      and (
        target_user_ids is null
        or cardinality(target_user_ids) = 0
        or ar.user_id = any(target_user_ids)
      )
    for update of ar
  ),
  updated_rows as (
    update public.attendance_records ar
    set time_out = action_timestamp
    from target_rows tr
    where ar.id = tr.record_id
    returning
      ar.id as record_id,
      ar.user_id as target_user_id,
      ar.attendance_date as target_attendance_date,
      ar.time_in as target_time_in,
      ar.time_out as target_time_out
  ),
  inserted_scans as (
    insert into public.attendance_scans (
      user_id,
      attendance_record_id,
      qr_session_id,
      scan_type,
      scanned_at,
      organization_id
    )
    select
      ur.target_user_id,
      ur.record_id,
      null,
      'time_out'::public.attendance_scan_type,
      action_timestamp,
      caller_org_id
    from updated_rows ur
    returning 1
  )
  select
    ur.record_id,
    ur.target_user_id,
    action_timestamp,
    ur.target_attendance_date,
    ur.target_time_in,
    ur.target_time_out
  from updated_rows ur
  cross join lateral (select count(*) from inserted_scans) as inserted(scan_count);
end;
$$;

create or replace function public.admin_revert_time_out(
  target_date date,
  target_user_ids uuid[]
)
returns table (
  attendance_record_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  action_timestamp timestamptz := now();
  caller_org_id uuid := public.get_default_organization_id();
  org_row public.organizations;
  org_date date;
begin
  if caller_org_id is null then
    raise exception 'No active organization context found.';
  end if;

  if not public.is_platform_admin() and not public.is_organization_admin(caller_org_id) then
    raise exception 'Only admins can revert attendance time-outs.';
  end if;

  select * into org_row from public.organizations where id = caller_org_id;
  if not found or org_row.status <> 'active' then
    raise exception 'Organization is not active.';
  end if;

  org_date := (action_timestamp at time zone org_row.timezone)::date;

  if target_date <> org_date then
    raise exception 'Time-out reversal is only available for the current attendance date.';
  end if;

  if target_user_ids is null or cardinality(target_user_ids) = 0 then
    raise exception 'Select at least one user to revert.';
  end if;

  return query
  with target_rows as (
    select ar.id as record_id
    from public.attendance_records ar
    join public.organization_memberships membership
      on membership.user_id = ar.user_id
      and membership.organization_id = caller_org_id
    where ar.attendance_date = target_date
      and ar.organization_id = caller_org_id
      and ar.time_in is not null
      and ar.time_out is not null
      and ar.user_id = any(target_user_ids)
    for update of ar
  ),
  deleted_scans as (
    delete from public.attendance_scans scans
    using target_rows tr
    where scans.attendance_record_id = tr.record_id
      and scans.scan_type = 'time_out'::public.attendance_scan_type
    returning 1
  ),
  updated_rows as (
    update public.attendance_records ar
    set time_out = null
    from target_rows tr
    where ar.id = tr.record_id
    returning ar.id as record_id
  )
  select ur.record_id
  from updated_rows ur
  cross join lateral (select count(*) from deleted_scans) as deleted(scan_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. triggers
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_activities_updated_at') then
    create trigger set_activities_updated_at
    before update on public.activities
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_activity_logs_updated_at') then
    create trigger set_activity_logs_updated_at
    before update on public.activity_logs
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 11. RLS: new tenant tables (fail closed)
-- ---------------------------------------------------------------------------
alter table public.activities enable row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_scans enable row level security;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select"
on public.activities
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
  or public.is_organization_member(organization_id)
);

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert"
on public.activities
for insert
to authenticated
with check (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

drop policy if exists "activities_update" on public.activities;
create policy "activities_update"
on public.activities
for update
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
)
with check (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select"
on public.activity_logs
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
  or (
    public.is_organization_member(organization_id)
    and membership_id = public.get_own_membership_id(organization_id)
  )
);

drop policy if exists "activity_scans_select" on public.activity_scans;
create policy "activity_scans_select"
on public.activity_scans
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
  or (
    public.is_organization_member(organization_id)
    and membership_id = public.get_own_membership_id(organization_id)
  )
);

-- ---------------------------------------------------------------------------
-- 12. RLS hardening: legacy tenant tables (org-scoped, fail closed)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_self_or_admin_select" on public.profiles;
create policy "profiles_self_or_admin_select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_platform_admin()
  or public.can_read_global_profile(id)
);

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_platform_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_platform_admin() or public.can_modify_global_profile(id))
with check (public.is_platform_admin() or public.can_modify_global_profile(id));

drop policy if exists "attendance_records_self_or_admin_select" on public.attendance_records;
create policy "attendance_records_self_or_admin_select"
on public.attendance_records
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

drop policy if exists "attendance_scans_self_or_admin_select" on public.attendance_scans;
create policy "attendance_scans_self_or_admin_select"
on public.attendance_scans
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

drop policy if exists "qr_sessions_admin_all" on public.qr_sessions;
create policy "qr_sessions_admin_all"
on public.qr_sessions
for all
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
)
with check (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

-- ---------------------------------------------------------------------------
-- 13. grants
-- ---------------------------------------------------------------------------
grant select on public.activities to authenticated;
grant select on public.activity_logs to authenticated;
grant select on public.activity_scans to authenticated;

grant execute on function public.get_own_membership_id(uuid) to authenticated;
grant execute on function public.can_read_global_profile(uuid) to authenticated;
grant execute on function public.can_modify_global_profile(uuid) to authenticated;
grant execute on function public.create_activity(text) to authenticated;
grant execute on function public.end_activity(uuid) to authenticated;
grant execute on function public.create_activity_qr_session(uuid, integer) to authenticated;
grant execute on function public.scan_activity(text) to authenticated;
