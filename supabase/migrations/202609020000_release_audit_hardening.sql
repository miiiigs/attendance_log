-- ============================================================================
-- Pre-Google-Play release audit hardening
--
-- Fixes four proven issues found during the release audit:
--
--   1. Privilege escalation: an organization admin could update their own
--      `profiles.platform_role` (or `role`) to gain platform-admin access,
--      because the profiles UPDATE grant + RLS (can_modify_global_profile)
--      allowed updating those columns. Role columns are now settable only by
--      privileged/owning roles (service role via SECURITY DEFINER or scripts).
--   2. Cross-tenant activity creation: `create_activity` resolved the target
--      organization from the caller's *default* organization instead of the
--      organization console being used. It now accepts an explicit
--      `target_organization_id` (the route passes the slug-scoped org) while
--      staying backward-compatible when omitted.
--   3. Organization admins could fabricate `organization_admin` memberships
--      directly through the Data API (bypassing the username counter and
--      platform-approval). Membership INSERT/UPDATE RLS now allows non-platform
--      admins to create/update `member` rows only.
--   4. (App code) org settings save silently no-op'd because organizations
--      UPDATE RLS is platform-admin-only; the settings route now writes through
--      the service role after the route-level org-admin guard.
--
-- Forward-only and idempotent so `supabase db reset` replays cleanly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lock down role columns on profiles
-- ---------------------------------------------------------------------------
-- `platform_role` and the legacy `role` must never be changeable through the
-- authenticated Data API. Only the service role (scripts / SECURITY DEFINER
-- server code) may assign them. Because the original grant is table-wide, we
-- revoke table-wide UPDATE and re-grant only the columns the authenticated
-- Data API is allowed to maintain.
revoke update on table public.profiles from authenticated;

grant update (first_name, last_name, email, status)
  on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Activity creation must target an explicit organization
-- ---------------------------------------------------------------------------
-- Keeps the previous positional single-argument form working (resolves the
-- caller's default organization) for backward compatibility, but lets the
-- organization console pass the slug-scoped organization so an admin operating
-- one tenant can never create an Activity in another tenant.
create or replace function public.create_activity(
  activity_name text,
  target_organization_id uuid default null
)
returns public.activities
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_org_id uuid := coalesce(target_organization_id, public.get_default_organization_id());
  org_row public.organizations;
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
      created_by
    )
    values (
      resolved_org_id,
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

-- Replace the legacy single-argument overload so callers cannot accidentally
-- fall back to default-organization resolution.
drop function if exists public.create_activity(activity_name text);

revoke all on function public.create_activity(text, uuid) from public;
revoke all on function public.create_activity(text, uuid) from anon;
grant execute on function public.create_activity(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Organization admins may only create/update member memberships
-- ---------------------------------------------------------------------------
-- Platform admins keep full membership control (admin provisioning, member
-- promotion). Non-platform admins can manage `member` rows in their own
-- organization only; they can never mint `organization_admin` memberships or
-- tamper with role fields through the Data API.
drop policy if exists "organization_memberships_admin_insert" on public.organization_memberships;
create policy "organization_memberships_admin_insert"
on public.organization_memberships
for insert
to authenticated
with check (
  public.is_platform_admin()
  or (public.is_organization_admin(organization_id) and role = 'member')
);

drop policy if exists "organization_memberships_admin_update" on public.organization_memberships;
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
  or (public.is_organization_admin(organization_id) and role = 'member')
);
