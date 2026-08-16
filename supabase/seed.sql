insert into public.app_settings (
  organization_name,
  timezone,
  work_start_time,
  work_end_time,
  grace_period_minutes
) values (
  'Attendance Logger',
  'Asia/Manila',
  '08:00',
  '17:00',
  10
)
on conflict do nothing;
