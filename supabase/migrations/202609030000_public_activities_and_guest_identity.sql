-- ============================================================================
-- Public activities, guest identity, and Community join authorization
--
-- Builds on the activity lifecycle model (202608220001 / 20260826221152) and
-- the release audit hardening (202609020000). This is a conservative, additive
-- refactor of the activity domain so that:
--
--   * activities may be PUBLIC (organization_id IS NULL) or belong to a
--     Community (organization_id set); visibility is modeled separately:
--     'community_only' vs 'anyone_with_code'
--   * participation is keyed on the global user identity (profiles.id), not
--     only on a Community membership, so guests and Community-less registered
--     users can join eligible activities
--   * Community membership is authorized by a Community Admin via a
--     pre-authorized, normalized email (organization_join_authorizations)
--   * a guest has a secure backend identity (Supabase anonymous auth) with a
--     profile that only carries a display name (no email / no username auth)
--
-- All mutations continue to flow through SECURITY DEFINER RPCs; clients cannot
-- write activity data directly. The proven Time-In / Leave / End lifecycle and
-- the `attendance://` QR payload are unchanged.
--
-- Forward-only and idempotent so `supabase db reset` replays cleanly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'activity_visibility'
  ) then
    create type public.activity_visibility as enum ('community_only', 'anyone_with_code');
  end if;

  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'organization_join_authorization_status'
  ) then
    create type public.organization_join_authorization_status as enum ('pending', 'claimed', 'revoked');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. profiles: allow guests (no email, no first/last name, display name)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists display_name text;
alter table public.profiles alter column first_name drop not null;
alter table public.profiles alter column last_name drop not null;
alter table public.profiles alter column email drop not null;

-- ---------------------------------------------------------------------------
-- 3. activities: nullable ownership + explicit visibility
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists visibility public.activity_visibility not null default 'community_only';

alter table public.activities alter column organization_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_public_visibility_check'
  ) then
    alter table public.activities
      add constraint activities_public_visibility_check
      check (organization_id is not null or visibility = 'anyone_with_code');
  end if;
end
$$;

create index if not exists activities_org_null_created_idx
  on public.activities (created_at desc)
  where organization_id is null;

-- ---------------------------------------------------------------------------
-- 4. qr_sessions: nullable organization for public-activity QR sessions
-- ---------------------------------------------------------------------------
alter table public.qr_sessions alter column organization_id drop not null;

-- ---------------------------------------------------------------------------
-- 5. activity_logs: key participation on the global user identity
-- ---------------------------------------------------------------------------
alter table public.activity_logs add column if not exists user_id uuid;

update public.activity_logs logs
set user_id = membership.user_id
from public.organization_memberships membership
where logs.membership_id = membership.id
  and logs.user_id is null;

alter table public.activity_logs alter column user_id set not null;

-- Replace composite cross-tenant FKs (which cannot express a NULL
-- organization) with simple FKs; tenant consistency is enforced in the
-- SECURITY DEFINER RPCs (the only write path) and by RLS.
alter table public.activity_logs drop constraint if exists activity_logs_activity_org_fk;
alter table public.activity_logs drop constraint if exists activity_logs_membership_org_fk;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_user_fk'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_user_fk
      foreign key (user_id) references public.profiles (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_activity_fk'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_activity_fk
      foreign key (activity_id) references public.activities (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_membership_fk'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_membership_fk
      foreign key (membership_id) references public.organization_memberships (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_organization_fk'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_organization_fk
      foreign key (organization_id) references public.organizations (id);
  end if;
end
$$;

alter table public.activity_logs alter column organization_id drop not null;
alter table public.activity_logs alter column membership_id drop not null;

alter table public.activity_logs drop constraint if exists activity_logs_activity_membership_uq;
create unique index if not exists activity_logs_activity_user_uidx
  on public.activity_logs (activity_id, user_id);

create index if not exists activity_logs_user_idx
  on public.activity_logs (user_id, time_in desc);

-- ---------------------------------------------------------------------------
-- 6. activity_scans: append-only audit with global user identity
-- ---------------------------------------------------------------------------
alter table public.activity_scans add column if not exists user_id uuid;

update public.activity_scans scans
set user_id = membership.user_id
from public.organization_memberships membership
where scans.membership_id = membership.id
  and scans.user_id is null;

alter table public.activity_scans alter column user_id set not null;

alter table public.activity_scans drop constraint if exists activity_scans_activity_org_fk;
alter table public.activity_scans drop constraint if exists activity_scans_membership_org_fk;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_scans_user_fk'
  ) then
    alter table public.activity_scans
      add constraint activity_scans_user_fk
      foreign key (user_id) references public.profiles (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_scans_activity_fk'
  ) then
    alter table public.activity_scans
      add constraint activity_scans_activity_fk
      foreign key (activity_id) references public.activities (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_scans_membership_fk'
  ) then
    alter table public.activity_scans
      add constraint activity_scans_membership_fk
      foreign key (membership_id) references public.organization_memberships (id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_scans_organization_fk'
  ) then
    alter table public.activity_scans
      add constraint activity_scans_organization_fk
      foreign key (organization_id) references public.organizations (id);
  end if;
end
$$;

alter table public.activity_scans alter column organization_id drop not null;
alter table public.activity_scans alter column membership_id drop not null;

-- ---------------------------------------------------------------------------
-- 7. organization_join_authorizations
-- ---------------------------------------------------------------------------
create table if not exists public.organization_join_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  normalized_email text not null,
  status public.organization_join_authorization_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  claimed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_join_authorizations_email_format
    check (normalized_email = lower(btrim(normalized_email)))
);

create unique index if not exists organization_join_authorizations_org_email_uidx
  on public.organization_join_authorizations (organization_id, normalized_email);

create index if not exists organization_join_authorizations_org_status_idx
  on public.organization_join_authorizations (organization_id, status);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_organization_join_authorizations_updated_at'
  ) then
    create trigger set_organization_join_authorizations_updated_at
    before update on public.organization_join_authorizations
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. authorization helpers
-- ---------------------------------------------------------------------------

-- True when the caller has an activity_log for the target activity (used by
-- the activities SELECT policy so guests and non-member participants can read
-- the activities they have joined).
create or replace function public.has_activity_log(target_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.activity_logs
    where activity_id = target_activity_id
      and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 9. activity RPCs
-- ---------------------------------------------------------------------------

-- Public activity creation: any REGISTERED (non-guest) user. Guests have no
-- profile email, so they are rejected here (guests cannot create activities).
create or replace function public.create_public_activity(activity_name text)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles;
  result public.activities;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(btrim(activity_name), '') = '' then
    raise exception 'Activity name is required.';
  end if;

  select * into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Only active users can create activities.';
  end if;

  if profile_row.email is null then
    raise exception 'Create an account to create activities.';
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

-- Community activity creation. `target_organization_id` may be omitted to
-- keep the legacy default-organization resolution (org admins operating a
-- single tenant). `visibility` defaults to 'community_only'.
drop function if exists public.create_activity(text, uuid);

create or replace function public.create_activity(
  activity_name text,
  target_organization_id uuid default null,
  visibility public.activity_visibility default 'community_only'
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

-- QR session generation: public activities may be QR'd by their creator;
-- community activities by that Community's admin (or platform admin).
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

-- Activity scan state machine. Participation is keyed on the global user id.
-- QR scan records Time In only; a second scan is rejected with guidance to
-- use Leave Activity. Guests and Community-less users may join public
-- activities and Community activities whose visibility is anyone_with_code.
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

-- Manual completion: the only member-side way to record Time Out.
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

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || activity_row.id::text, 0));

  select *
  into log_row
  from public.activity_logs
  where public.activity_logs.activity_id = activity_row.id
    and public.activity_logs.user_id = current_user_id
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
        and public.activity_logs.user_id = current_user_id;
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

-- Ending an activity auto-completes still-open participants. Public activities
-- may be ended by their creator; community activities by that Community's admin.
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

  if activity_row.organization_id is null then
    if not public.is_platform_admin() and activity_row.created_by is distinct from auth.uid() then
      raise exception 'Only the activity creator can end this activity.';
    end if;
  else
    if not public.is_platform_admin() and not public.is_organization_admin(activity_row.organization_id) then
      raise exception 'Only organization administrators can end activities.';
    end if;
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
-- 10. Guest profile creation
-- ---------------------------------------------------------------------------
create or replace function public.create_guest_profile(display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles;
  generated_username text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(btrim(display_name), '') = '' then
    raise exception 'Display name is required.';
  end if;

  select * into profile_row
  from public.profiles
  where id = current_user_id;

  if found then
    if profile_row.email is not null then
      raise exception 'This account is already registered.';
    end if;

    update public.profiles
    set display_name = btrim(display_name),
        updated_at = now()
    where id = current_user_id
    returning * into profile_row;

    return profile_row;
  end if;

  generated_username := 'guest_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    email,
    display_name,
    role,
    status
  )
  values (
    current_user_id,
    generated_username,
    null,
    null,
    null,
    btrim(display_name),
    'person',
    'active'
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Community join by code (email-authorized)
-- ---------------------------------------------------------------------------
create or replace function public.join_organization_by_code(community_code text)
returns table (
  community_id uuid,
  organization_name text,
  organization_code text,
  organization_slug text,
  organization_timezone text,
  membership_id uuid,
  membership_username text,
  membership_role public.organization_membership_role,
  membership_status public.account_status
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles;
  org_row public.organizations;
  authorization_row public.organization_join_authorizations;
  existing_membership public.organization_memberships;
  next_username text;
  membership_row public.organization_memberships;
  next_sequence integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(community_code), '') = '' then
    raise exception 'Community code is required.';
  end if;

  select * into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Your account is inactive.';
  end if;

  if profile_row.email is null then
    raise exception 'Create an account before joining a Community.';
  end if;

  select * into org_row
  from public.organizations
  where lower(code) = lower(btrim(community_code))
  limit 1;

  if not found then
    raise exception 'Community not found.';
  end if;

  if org_row.status <> 'active' then
    raise exception 'This Community is currently unavailable.';
  end if;

  -- Already a member? Return the existing membership (idempotent).
  select * into existing_membership
  from public.organization_memberships membership
  where membership.organization_id = org_row.id
    and membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;

  if found then
    return query
    select
      org_row.id,
      org_row.name,
      org_row.code,
      org_row.slug,
      org_row.timezone,
      existing_membership.id,
      existing_membership.username,
      existing_membership.role,
      existing_membership.status;
    return;
  end if;

  -- The registered user's verified email must be pre-authorized by an admin.
  select * into authorization_row
  from public.organization_join_authorizations join_auth
  where join_auth.organization_id = org_row.id
    and join_auth.normalized_email = lower(btrim(profile_row.email))
    and join_auth.status = 'pending'
  order by join_auth.created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'Your account is not registered with this Community. Please contact a Community administrator.';
  end if;

  -- Generate the next member username atomically (security-definer owns the
  -- counter table; no admin permission is required for the joining member).
  insert into public.organization_membership_username_counters (
    organization_id,
    counter_type,
    last_sequence,
    updated_at
  )
  values (
    org_row.id,
    'member'::public.organization_membership_role,
    1,
    now()
  )
  on conflict (organization_id, counter_type)
  do update
  set
    last_sequence = public.organization_membership_username_counters.last_sequence + 1,
    updated_at = now()
  returning last_sequence into next_sequence;

  next_username := org_row.code || '_' || case
    when length(next_sequence::text) < 4 then lpad(next_sequence::text, 4, '0')
    else next_sequence::text
  end;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    username,
    role,
    status
  )
  values (
    org_row.id,
    current_user_id,
    next_username,
    'member',
    'active'
  )
  returning * into membership_row;

  update public.organization_join_authorizations
  set status = 'claimed',
      claimed_by = current_user_id,
      updated_at = now()
  where id = authorization_row.id;

  return query
  select
    org_row.id,
    org_row.name,
    org_row.code,
    org_row.slug,
    org_row.timezone,
    membership_row.id,
    membership_row.username,
    membership_row.role,
    membership_row.status;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. RLS updates for the public/guest model
-- ---------------------------------------------------------------------------
drop policy if exists "activities_select" on public.activities;
create policy "activities_select"
on public.activities
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
  or public.is_organization_member(organization_id)
  or public.has_activity_log(id)
  or created_by = auth.uid()
);

drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select"
on public.activity_logs
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
  or user_id = auth.uid()
);

-- Participants of a Community activity (including non-members who joined an
-- anyone_with_code activity) may read that Community's basic identity so the
-- activity source can be labeled. This is a minimal, participation-scoped
-- disclosure and does not grant membership or management access.
drop policy if exists "organizations_select_member_or_platform" on public.organizations;
create policy "organizations_select_member_or_platform"
on public.organizations
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_member(id)
  or exists (
    select 1
    from public.activity_logs al
    join public.activities a on a.id = al.activity_id
    where a.organization_id = public.organizations.id
      and al.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 13. organization_join_authorizations RLS (admin-managed, server-enforced)
-- ---------------------------------------------------------------------------
alter table public.organization_join_authorizations enable row level security;

drop policy if exists "organization_join_authorizations_select" on public.organization_join_authorizations;
create policy "organization_join_authorizations_select"
on public.organization_join_authorizations
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

-- Writes are performed server-side (service role) only; clients get read-only
-- access so Community Admins can list authorizations in their console.
revoke insert, update, delete on table public.organization_join_authorizations from authenticated;
grant select on table public.organization_join_authorizations to authenticated;

-- ---------------------------------------------------------------------------
-- 14. grants for new/changed RPCs
-- ---------------------------------------------------------------------------
revoke all on function public.create_public_activity(text) from public;
revoke all on function public.create_public_activity(text) from anon;
grant execute on function public.create_public_activity(text) to authenticated;

revoke all on function public.create_activity(text, uuid, public.activity_visibility) from public;
revoke all on function public.create_activity(text, uuid, public.activity_visibility) from anon;
grant execute on function public.create_activity(text, uuid, public.activity_visibility) to authenticated;

revoke all on function public.create_guest_profile(text) from public;
revoke all on function public.create_guest_profile(text) from anon;
grant execute on function public.create_guest_profile(text) to authenticated;

revoke all on function public.join_organization_by_code(text) from public;
revoke all on function public.join_organization_by_code(text) from anon;
grant execute on function public.join_organization_by_code(text) to authenticated;

revoke all on function public.has_activity_log(uuid) from public;
revoke all on function public.has_activity_log(uuid) from anon;
grant execute on function public.has_activity_log(uuid) to authenticated;

-- Re-affirm execute grants for re-created activity RPCs.
revoke all on function public.scan_activity(text) from public;
revoke all on function public.scan_activity(text) from anon;
grant execute on function public.scan_activity(text) to authenticated;

revoke all on function public.leave_activity(uuid) from public;
revoke all on function public.leave_activity(uuid) from anon;
grant execute on function public.leave_activity(uuid) to authenticated;

revoke all on function public.end_activity(uuid) from public;
revoke all on function public.end_activity(uuid) from anon;
grant execute on function public.end_activity(uuid) to authenticated;

revoke all on function public.create_activity_qr_session(uuid, integer) from public;
revoke all on function public.create_activity_qr_session(uuid, integer) from anon;
grant execute on function public.create_activity_qr_session(uuid, integer) to authenticated;
