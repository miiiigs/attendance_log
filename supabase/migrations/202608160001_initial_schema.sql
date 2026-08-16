create extension if not exists pgcrypto;

create type public.app_role as enum ('employee', 'admin');
create type public.account_status as enum ('active', 'inactive');
create type public.attendance_scan_type as enum ('time_in', 'time_out');
create type public.qr_session_status as enum ('active', 'expired', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  employee_id text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  department text,
  position text,
  role public.app_role not null default 'employee',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  attendance_date date not null,
  time_in timestamptz,
  time_out timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, attendance_date),
  constraint attendance_record_time_order check (
    time_out is null or time_in is null or time_out >= time_in
  )
);

create table public.qr_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  status public.qr_session_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint qr_session_valid_window check (expires_at > valid_from)
);

create table public.attendance_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  attendance_record_id uuid not null references public.attendance_records (id) on delete restrict,
  qr_session_id uuid references public.qr_sessions (id) on delete set null,
  scan_type public.attendance_scan_type not null,
  scanned_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null default 'Attendance Logger',
  timezone text not null default 'Asia/Manila',
  work_start_time text not null default '08:00',
  work_end_time text not null default '17:00',
  grace_period_minutes integer not null default 10 check (grace_period_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attendance_records_date_idx on public.attendance_records (attendance_date desc);
create index attendance_records_user_idx on public.attendance_records (user_id, attendance_date desc);
create index attendance_scans_user_idx on public.attendance_scans (user_id, scanned_at desc);
create index attendance_scans_record_idx on public.attendance_scans (attendance_record_id);
create index qr_sessions_active_idx on public.qr_sessions (status, expires_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row
execute function public.set_updated_at();

create trigger set_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.expire_old_qr_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.qr_sessions
  set status = 'expired'
  where status = 'active'
    and expires_at < now();
$$;

create or replace function public.create_qr_session(ttl_seconds integer default 45)
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
  raw_token text := encode(gen_random_bytes(24), 'hex');
  hashed_token text := encode(digest(raw_token, 'sha256'), 'hex');
  session_row public.qr_sessions;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create attendance QR codes.';
  end if;

  if ttl_seconds < 30 or ttl_seconds > 60 then
    raise exception 'QR TTL must be between 30 and 60 seconds.';
  end if;

  perform public.expire_old_qr_sessions();

  insert into public.qr_sessions (
    token_hash,
    valid_from,
    expires_at,
    status,
    created_by
  )
  values (
    hashed_token,
    now(),
    now() + make_interval(secs => ttl_seconds),
    'active',
    current_user_id
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
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke attendance QR codes.';
  end if;

  update public.qr_sessions
  set status = 'revoked'
  where id = session_id
    and status = 'active';
end;
$$;

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
  current_time timestamptz := now();
  manila_date date := (current_time at time zone 'Asia/Manila')::date;
  profile_row public.profiles;
  session_row public.qr_sessions;
  record_row public.attendance_records;
  scan_kind public.attendance_scan_type;
  hashed_token text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(qr_token), '') = '' then
    raise exception 'Invalid attendance QR.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || manila_date::text, 0));

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if profile_row.role <> 'employee' then
    raise exception 'Only employee accounts can scan attendance.';
  end if;

  if profile_row.status <> 'active' then
    raise exception 'Your account is inactive.';
  end if;

  perform public.expire_old_qr_sessions();
  hashed_token := encode(digest(qr_token, 'sha256'), 'hex');

  select *
  into session_row
  from public.qr_sessions
  where token_hash = hashed_token
    and status = 'active'
    and valid_from <= current_time
    and expires_at >= current_time
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'QR code has expired.';
  end if;

  select *
  into record_row
  from public.attendance_records
  where user_id = current_user_id
    and attendance_date = manila_date
  for update;

  if not found then
    insert into public.attendance_records (
      user_id,
      attendance_date,
      time_in,
      time_out
    )
    values (
      current_user_id,
      manila_date,
      current_time,
      null
    )
    returning * into record_row;

    scan_kind := 'time_in';
  elsif record_row.time_in is not null and record_row.time_out is null then
    update public.attendance_records
    set time_out = current_time
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
    scanned_at
  )
  values (
    current_user_id,
    record_row.id,
    session_row.id,
    scan_kind,
    current_time
  );

  return query
  select
    record_row.id,
    record_row.attendance_date,
    scan_kind,
    current_time,
    record_row.time_in,
    record_row.time_out,
    case
      when scan_kind = 'time_in' then 'Time in recorded successfully.'
      else 'Time out recorded successfully.'
    end;
end;
$$;

grant usage on schema public to authenticated, anon;
grant select on public.profiles to authenticated;
grant select on public.attendance_records to authenticated;
grant select on public.attendance_scans to authenticated;
grant select on public.qr_sessions to authenticated;
grant select on public.app_settings to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update on public.qr_sessions to authenticated;
grant update on public.app_settings to authenticated;
grant execute on function public.create_qr_session(integer) to authenticated;
grant execute on function public.revoke_qr_session(uuid) to authenticated;
grant execute on function public.scan_attendance(text) to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_scans enable row level security;
alter table public.qr_sessions enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles_self_or_admin_select"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "attendance_records_self_or_admin_select"
on public.attendance_records
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "attendance_scans_self_or_admin_select"
on public.attendance_scans
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "qr_sessions_admin_all"
on public.qr_sessions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "app_settings_admin_select"
on public.app_settings
for select
to authenticated
using (public.is_admin());

create policy "app_settings_admin_update"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
