-- ============================================================================
-- Display-name editing RPCs
--
-- Allows a signed-in user to edit their own display names without ever
-- touching authorization data:
--
--   * update_profile_display_name(text)
--       - edits the caller's GLOBAL QRLog display name (profiles.display_name)
--   * update_own_community_display_name(uuid, text)
--       - edits the caller's Community-scoped display name on their OWN active
--         membership (organization_memberships.display_name)
--
-- Both are SECURITY DEFINER with a pinned search_path, require auth.uid(),
-- trim the input, and enforce a 1-80 character bound. Neither accepts a
-- target user id, email, role, status, or username, so a caller can never
-- modify another identity or elevate their own permissions. This migration
-- does NOT loosen table RLS; the edits are server-authoritative only.
--
-- Additive and production-safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Global profile display name
-- ---------------------------------------------------------------------------
create or replace function public.update_profile_display_name(new_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_display_name text;
  profile_row public.profiles;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  normalized_display_name := btrim(coalesce(new_display_name, ''));
  if length(normalized_display_name) < 1 then
    raise exception 'Display name is required.';
  end if;
  if length(normalized_display_name) > 80 then
    raise exception 'Display name must be 80 characters or fewer.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if not found or profile_row.status <> 'active' then
    raise exception 'Your account is inactive.';
  end if;

  update public.profiles
  set display_name = normalized_display_name,
      updated_at = now()
  where id = current_user_id
  returning * into profile_row;

  return profile_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Community-scoped display name (caller's own membership only)
-- ---------------------------------------------------------------------------
create or replace function public.update_own_community_display_name(
  target_organization_id uuid,
  new_display_name text
)
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_display_name text;
  membership_row public.organization_memberships;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_organization_id is null then
    raise exception 'Community is required.';
  end if;

  normalized_display_name := btrim(coalesce(new_display_name, ''));
  if length(normalized_display_name) < 1 then
    raise exception 'Display name is required.';
  end if;
  if length(normalized_display_name) > 80 then
    raise exception 'Display name must be 80 characters or fewer.';
  end if;

  -- Resolve the caller's membership in the target Community only. There is no
  -- membership id or user id parameter, so another member's row can never be
  -- selected, and only ACTIVE memberships are eligible.
  select *
  into membership_row
  from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = current_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'You are not an active member of this Community.';
  end if;

  update public.organization_memberships
  set display_name = normalized_display_name,
      updated_at = now()
  where id = membership_row.id
  returning * into membership_row;

  return membership_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: authenticated-only, never anon/public
-- ---------------------------------------------------------------------------
revoke all on function public.update_profile_display_name(text) from public;
revoke all on function public.update_profile_display_name(text) from anon;
grant execute on function public.update_profile_display_name(text) to authenticated;

revoke all on function public.update_own_community_display_name(uuid, text) from public;
revoke all on function public.update_own_community_display_name(uuid, text) from anon;
grant execute on function public.update_own_community_display_name(uuid, text) to authenticated;
