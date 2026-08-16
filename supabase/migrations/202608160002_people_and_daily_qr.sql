alter type public.app_role rename value 'employee' to 'person';

alter table public.profiles rename column employee_id to username;
alter table public.profiles drop column if exists department;
alter table public.profiles drop column if exists position;
alter table public.profiles alter column role set default 'person';

create table if not exists public.username_counters (
  year integer primary key,
  last_sequence integer not null check (last_sequence >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_next_username(target_year integer default extract(year from timezone('Asia/Manila', now()))::integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_sequence integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate usernames.';
  end if;

  insert into public.username_counters (year, last_sequence, updated_at)
  values (target_year, 1, now())
  on conflict (year)
  do update
  set last_sequence = public.username_counters.last_sequence + 1,
      updated_at = now()
  returning last_sequence into next_sequence;

  return target_year::text || lpad(next_sequence::text, 5, '0');
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

  if profile_row.role <> 'person' then
    raise exception 'Only person accounts can scan attendance.';
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
  raw_token text := encode(gen_random_bytes(24), 'hex');
  hashed_token text := encode(digest(raw_token, 'sha256'), 'hex');
  session_row public.qr_sessions;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create attendance QR codes.';
  end if;

  if ttl_seconds < 60 or ttl_seconds > 43200 then
    raise exception 'QR TTL must be between 60 seconds and 12 hours.';
  end if;

  perform public.expire_old_qr_sessions();

  update public.qr_sessions
  set status = 'revoked'
  where status = 'active';

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

create or replace function public.delete_qr_session(session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete attendance QR codes.';
  end if;

  delete from public.qr_sessions
  where id = session_id;
end;
$$;

grant delete on public.qr_sessions to authenticated;
grant execute on function public.generate_next_username(integer) to authenticated;
grant execute on function public.delete_qr_session(uuid) to authenticated;
