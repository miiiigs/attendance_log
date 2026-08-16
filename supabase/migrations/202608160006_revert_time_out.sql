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
  manila_date date := (action_timestamp at time zone 'Asia/Manila')::date;
begin
  if not public.is_admin() then
    raise exception 'Only admins can revert attendance time-outs.';
  end if;

  if target_date <> manila_date then
    raise exception 'Time-out reversal is only available for the current Manila attendance date.';
  end if;

  if target_user_ids is null or cardinality(target_user_ids) = 0 then
    raise exception 'Select at least one user to revert.';
  end if;

  return query
  with target_rows as (
    select ar.id as record_id
    from public.attendance_records ar
    where ar.attendance_date = target_date
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

grant execute on function public.admin_revert_time_out(date, uuid[]) to authenticated;
