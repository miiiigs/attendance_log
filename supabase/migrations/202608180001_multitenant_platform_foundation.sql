do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'platform_role'
  ) then
    create type public.platform_role as enum ('user', 'platform_admin');
  end if;

  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'organization_status'
  ) then
    create type public.organization_status as enum ('active', 'suspended', 'archived');
  end if;

  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'organization_membership_role'
  ) then
    create type public.organization_membership_role as enum ('organization_admin', 'member');
  end if;

  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'organization_application_status'
  ) then
    create type public.organization_application_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'user';

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  slug text not null,
  status public.organization_status not null default 'active',
  timezone text not null default 'Asia/Manila',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_code_format check (code ~ '^[A-Z0-9-]{3,20}$'),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists organizations_code_lower_uidx on public.organizations (lower(code));
create unique index if not exists organizations_slug_lower_uidx on public.organizations (lower(slug));

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  role public.organization_membership_role not null default 'member',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_username_format check (username ~ '^[A-Za-z0-9._-]{3,32}$')
);

create unique index if not exists organization_memberships_org_user_uidx
  on public.organization_memberships (organization_id, user_id);
create unique index if not exists organization_memberships_org_username_uidx
  on public.organization_memberships (organization_id, username);

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_first_name text not null,
  contact_last_name text not null,
  contact_email text not null,
  organization_type text,
  estimated_member_count integer check (estimated_member_count is null or estimated_member_count >= 0),
  message text,
  status public.organization_application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_username_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  year integer not null,
  last_sequence integer not null check (last_sequence >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, year)
);

create index if not exists organization_memberships_org_role_status_idx
  on public.organization_memberships (organization_id, role, status);
create index if not exists organization_applications_status_created_idx
  on public.organization_applications (status, created_at desc);
create index if not exists organizations_status_created_idx
  on public.organizations (status, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organizations_updated_at'
  ) then
    create trigger set_organizations_updated_at
    before update on public.organizations
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organization_memberships_updated_at'
  ) then
    create trigger set_organization_memberships_updated_at
    before update on public.organization_memberships
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organization_applications_updated_at'
  ) then
    create trigger set_organization_applications_updated_at
    before update on public.organization_applications
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

insert into public.organizations (
  name,
  code,
  slug,
  status,
  timezone,
  approved_at
)
select
  coalesce(
    (
      select organization_name
      from public.app_settings
      order by created_at asc
      limit 1
    ),
    'South Cotabato Parole and Probation Administration'
  ),
  'SCPPA',
  'scppa',
  'active',
  coalesce(
    (
      select timezone
      from public.app_settings
      order by created_at asc
      limit 1
    ),
    'Asia/Manila'
  ),
  now()
where not exists (
  select 1
  from public.organizations
  where lower(code) = 'scppa'
);

update public.profiles
set platform_role = 'platform_admin'
where role = 'admin';

insert into public.organization_memberships (
  organization_id,
  user_id,
  username,
  role,
  status,
  created_at,
  updated_at
)
select
  organization_row.id,
  profile_row.id,
  profile_row.username,
  case
    when profile_row.role = 'admin' then 'organization_admin'::public.organization_membership_role
    else 'member'::public.organization_membership_role
  end,
  profile_row.status,
  profile_row.created_at,
  profile_row.updated_at
from public.profiles profile_row
cross join lateral (
  select id
  from public.organizations
  where lower(code) = 'scppa'
  limit 1
) as organization_row
on conflict (organization_id, user_id)
do update
set
  username = excluded.username,
  role = excluded.role,
  status = excluded.status,
  updated_at = excluded.updated_at;

insert into public.organization_username_counters (
  organization_id,
  year,
  last_sequence,
  updated_at
)
select
  membership.organization_id,
  left(membership.username, 4)::integer,
  max(right(membership.username, 5)::integer),
  now()
from public.organization_memberships membership
where membership.username ~ '^\d{9}$'
group by membership.organization_id, left(membership.username, 4)
on conflict (organization_id, year)
do update
set
  last_sequence = greatest(public.organization_username_counters.last_sequence, excluded.last_sequence),
  updated_at = now();

alter table public.attendance_records
  add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.attendance_scans
  add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.qr_sessions
  add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

update public.attendance_records
set organization_id = organization_row.id
from (
  select id
  from public.organizations
  where lower(code) = 'scppa'
  limit 1
) as organization_row
where public.attendance_records.organization_id is null;

update public.attendance_scans
set organization_id = organization_row.id
from (
  select id
  from public.organizations
  where lower(code) = 'scppa'
  limit 1
) as organization_row
where public.attendance_scans.organization_id is null;

update public.qr_sessions
set organization_id = organization_row.id
from (
  select id
  from public.organizations
  where lower(code) = 'scppa'
  limit 1
) as organization_row
where public.qr_sessions.organization_id is null;

alter table public.attendance_records
  alter column organization_id set not null;

alter table public.attendance_scans
  alter column organization_id set not null;

alter table public.qr_sessions
  alter column organization_id set not null;

create index if not exists attendance_records_org_date_idx
  on public.attendance_records (organization_id, attendance_date desc);
create index if not exists attendance_scans_org_scanned_idx
  on public.attendance_scans (organization_id, scanned_at desc);
create index if not exists qr_sessions_org_status_idx
  on public.qr_sessions (organization_id, status, expires_at desc);

create or replace function public.get_default_organization_id(target_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select membership.organization_id
  from public.organization_memberships membership
  join public.organizations organization_row
    on organization_row.id = membership.organization_id
  where membership.user_id = coalesce(target_user_id, auth.uid())
    and membership.status = 'active'
    and organization_row.status <> 'archived'
  order by
    case when membership.role = 'organization_admin' then 0 else 1 end,
    membership.created_at asc
  limit 1;
$$;

create or replace function public.is_platform_admin()
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
      and platform_role = 'platform_admin'
      and status = 'active'
  );
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_memberships membership
    join public.organizations organization_row
      on organization_row.id = membership.organization_id
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and organization_row.status = 'active'
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_memberships membership
    join public.organizations organization_row
      on organization_row.id = membership.organization_id
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'organization_admin'
      and membership.status = 'active'
      and organization_row.status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists(
      select 1
      from public.organization_memberships membership
      join public.organizations organization_row
        on organization_row.id = membership.organization_id
      where membership.user_id = auth.uid()
        and membership.role = 'organization_admin'
        and membership.status = 'active'
        and organization_row.status = 'active'
    );
$$;

create or replace function public.generate_next_membership_username(
  target_organization_id uuid,
  target_year integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_sequence integer;
  resolved_year integer;
  organization_timezone text;
begin
  if not public.is_platform_admin() and not public.is_organization_admin(target_organization_id) then
    raise exception 'Only organization administrators can generate usernames.';
  end if;

  select timezone
  into organization_timezone
  from public.organizations
  where id = target_organization_id;

  if organization_timezone is null then
    raise exception 'Organization not found.';
  end if;

  resolved_year := coalesce(
    target_year,
    extract(year from timezone(organization_timezone, now()))::integer
  );

  insert into public.organization_username_counters (
    organization_id,
    year,
    last_sequence,
    updated_at
  )
  values (
    target_organization_id,
    resolved_year,
    1,
    now()
  )
  on conflict (organization_id, year)
  do update
  set
    last_sequence = public.organization_username_counters.last_sequence + 1,
    updated_at = now()
  returning last_sequence into next_sequence;

  return resolved_year::text || lpad(next_sequence::text, 5, '0');
end;
$$;

create or replace function public.generate_next_username(target_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  default_organization_id uuid;
begin
  default_organization_id := public.get_default_organization_id();

  if default_organization_id is null then
    raise exception 'No active organization context found for username generation.';
  end if;

  return public.generate_next_membership_username(default_organization_id, target_year);
end;
$$;

grant select on public.organizations to authenticated;
grant insert, update on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant insert, update on public.organization_memberships to authenticated;
grant select, insert, update on public.organization_applications to authenticated;
grant insert on public.organization_applications to anon;
grant execute on function public.get_default_organization_id(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.generate_next_membership_username(uuid, integer) to authenticated;
grant execute on function public.generate_next_username(integer) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_applications enable row level security;

create policy "organizations_select_member_or_platform"
on public.organizations
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_organization_member(id)
);

create policy "organizations_platform_insert"
on public.organizations
for insert
to authenticated
with check (public.is_platform_admin());

create policy "organizations_platform_update"
on public.organizations
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "organization_memberships_select_scoped"
on public.organization_memberships
for select
to authenticated
using (
  public.is_platform_admin()
  or user_id = auth.uid()
  or public.is_organization_admin(organization_id)
);

create policy "organization_memberships_admin_insert"
on public.organization_memberships
for insert
to authenticated
with check (
  public.is_platform_admin()
  or public.is_organization_admin(organization_id)
);

create policy "organization_memberships_admin_update"
on public.organization_memberships
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

create policy "organization_applications_public_insert"
on public.organization_applications
for insert
to anon, authenticated
with check (true);

create policy "organization_applications_platform_select"
on public.organization_applications
for select
to authenticated
using (public.is_platform_admin());

create policy "organization_applications_platform_update"
on public.organization_applications
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
