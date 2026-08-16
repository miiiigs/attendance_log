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
  manila_date date := (scan_timestamp at time zone 'Asia/Manila')::date;
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
    and valid_from <= scan_timestamp
    and expires_at >= scan_timestamp
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
      scan_timestamp,
      null
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
    scanned_at
  )
  values (
    current_user_id,
    record_row.id,
    session_row.id,
    scan_kind,
    scan_timestamp
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
