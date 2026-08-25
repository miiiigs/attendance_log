-- Role-aware, per-organization username counters and generator.
--
-- Replaces the deprecated year-based `YYYYNNNNN` scheme with permanent,
-- role-aware usernames:
--
--   organization_admin -> <ORGCODE>_admin_<SEQUENCE>   (no padding)
--   member             -> <ORGCODE>_<SEQUENCE>          (minimum 4-digit padding)
--
-- Two independent, monotonically-increasing counters per organization ensure
-- admin allocation never consumes member sequence numbers and vice versa.
-- Counters never reset and never reuse numbers.

-- ---------------------------------------------------------------------------
-- 1. New counter table keyed by (organization_id, counter_type).
--    counter_type reuses the organization_membership_role enum.
-- ---------------------------------------------------------------------------
create table if not exists public.organization_membership_username_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  counter_type public.organization_membership_role not null,
  last_sequence integer not null check (last_sequence >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, counter_type)
);

-- Lock down like the legacy counter: only SECURITY DEFINER functions may touch it.
alter table public.organization_membership_username_counters enable row level security;

revoke all on table public.organization_membership_username_counters from public;
revoke all on table public.organization_membership_username_counters from anon;
revoke all on table public.organization_membership_username_counters from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Widen the membership username constraint so a 20-character organization
--    code plus an `<ORGCODE>_admin_<SEQUENCE>` suffix is never rejected.
--    This only relaxes the maximum length; the character set is unchanged.
-- ---------------------------------------------------------------------------
alter table public.organization_memberships
  drop constraint if exists organization_memberships_username_format;

alter table public.organization_memberships
  add constraint organization_memberships_username_format
  check (username ~ '^[A-Za-z0-9._-]{3,64}$');

-- ---------------------------------------------------------------------------
-- 3. Authoritative role-aware generator.
--
--    organization_admin: platform admin only.
--    member:            platform admin or organization admin of the target org.
--
--    The organization code is resolved from the database (never from input).
--    Allocation uses an atomic UPSERT + increment, so concurrent callers can
--    never receive the same sequence number.
-- ---------------------------------------------------------------------------
create or replace function public.generate_membership_username(
  target_organization_id uuid,
  target_role public.organization_membership_role
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_sequence integer;
  organization_code text;
begin
  if target_role = 'organization_admin' then
    if not public.is_platform_admin() then
      raise exception 'Only platform administrators can generate administrator usernames.';
    end if;
  else
    if not public.is_platform_admin() and not public.is_organization_admin(target_organization_id) then
      raise exception 'Only organization administrators can generate usernames.';
    end if;
  end if;

  select code
  into organization_code
  from public.organizations
  where id = target_organization_id;

  if organization_code is null then
    raise exception 'Organization not found.';
  end if;

  insert into public.organization_membership_username_counters (
    organization_id,
    counter_type,
    last_sequence,
    updated_at
  )
  values (
    target_organization_id,
    target_role,
    1,
    now()
  )
  on conflict (organization_id, counter_type)
  do update
  set
    last_sequence = public.organization_membership_username_counters.last_sequence + 1,
    updated_at = now()
  returning last_sequence into next_sequence;

  if target_role = 'organization_admin' then
    return organization_code || '_admin_' || next_sequence::text;
  end if;

  -- Minimum 4-digit padding only. PostgreSQL's lpad truncates values that
  -- already exceed the target width, so guard against that explicitly.
  return organization_code || '_' || case
    when length(next_sequence::text) < 4 then lpad(next_sequence::text, 4, '0')
    else next_sequence::text
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Function execute surface: authenticated only.
-- ---------------------------------------------------------------------------
revoke all on function public.generate_membership_username(uuid, public.organization_membership_role) from public;
revoke all on function public.generate_membership_username(uuid, public.organization_membership_role) from anon;
grant execute on function public.generate_membership_username(uuid, public.organization_membership_role) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Drop the deprecated year-based generator so it can never drive new
--    username creation again.
-- ---------------------------------------------------------------------------
drop function if exists public.generate_next_username(integer);
drop function if exists public.generate_next_membership_username(uuid, integer);
