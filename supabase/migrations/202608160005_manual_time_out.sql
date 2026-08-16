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
  manila_date date := (action_timestamp at time zone 'Asia/Manila')::date;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manually time out attendance.';
  end if;

  if target_date <> manila_date then
    raise exception 'Bulk time out is only available for the current Manila attendance date.';
  end if;

  return query
  with target_rows as (
    select
      ar.id as record_id,
      ar.user_id as target_user_id,
      ar.attendance_date as target_attendance_date,
      ar.time_in as target_time_in
    from public.attendance_records ar
    join public.profiles p on p.id = ar.user_id
    where ar.attendance_date = target_date
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
      scanned_at
    )
    select
      ur.target_user_id,
      ur.record_id,
      null,
      'time_out'::public.attendance_scan_type,
      action_timestamp
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
  manila_date date := (action_timestamp at time zone 'Asia/Manila')::date;
  profile_row public.profiles;
  record_row public.attendance_records;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to record a time out.';
  end if;

  select *
  into profile_row
  from public.profiles p
  where p.id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Only active users can record a time out.';
  end if;

  select ar.*
  into record_row
  from public.attendance_records ar
  where ar.user_id = current_user_id
    and ar.attendance_date = manila_date
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
    scanned_at
  )
  values (
    current_user_id,
    record_row.id,
    null,
    'time_out'::public.attendance_scan_type,
    action_timestamp
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

grant execute on function public.admin_force_time_out(date, uuid[]) to authenticated;
grant execute on function public.self_time_out() to authenticated;
