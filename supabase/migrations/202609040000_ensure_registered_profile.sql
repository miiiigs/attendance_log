-- ============================================================================
-- Registered profile bootstrap (first-time Email / Google users)
--
-- A fresh email sign-up or a new Google OAuth user creates an `auth.users`
-- identity WITHOUT an existing `public.profiles` row. This migration adds a
-- small, server-authoritative, idempotent RPC that creates the caller's own
-- profile after their email is verified:
--
--   * requires an authenticated permanent (non-anonymous) caller
--   * the verified Auth email comes from current_verified_auth_email(), which
--     reads auth.users directly -- submitted email is never trusted
--   * creates a profile ONLY for the current caller (no user_id parameter)
--   * role = person, status = active, generated internal `user_` username
--   * display name is non-authorization profile data (client-supplied only)
--   * preserves an existing profile (including guest-upgraded history) and
--     never duplicates it; safe to call idempotently after any sign-in/OAuth
--
-- Additive and production-safe. No auth.users trigger is introduced.
-- ============================================================================

create or replace function public.ensure_registered_profile(display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  verified_email text;
  profile_row public.profiles;
  normalized_display_name text := nullif(btrim(coalesce(display_name, '')), '');
  generated_username text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Permanent + verified identity only. current_verified_auth_email() returns
  -- NULL for anonymous users and for unconfirmed email-link states.
  verified_email := public.current_verified_auth_email();
  if verified_email is null then
    raise exception 'Verify your email before continuing.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if found then
    -- Idempotent, caller-owned updates. Preserve the existing profile and any
    -- guest-upgraded activity history; never duplicate it. Only backfill
    -- profile.email (display/cache) from the verified Auth email when empty.
    if profile_row.email is null then
      update public.profiles
      set email = verified_email,
          updated_at = now()
      where id = current_user_id
      returning * into profile_row;
    end if;

    if normalized_display_name is not null and profile_row.display_name is null then
      update public.profiles
      set display_name = normalized_display_name,
          updated_at = now()
      where id = current_user_id
      returning * into profile_row;
    end if;

    return profile_row;
  end if;

  generated_username := 'user_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    email,
    display_name,
    role,
    status
  )
  values (
    current_user_id,
    generated_username,
    null,
    null,
    verified_email,
    normalized_display_name,
    'person',
    'active'
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

-- Authenticated users only (same surface as the guest/verified helpers).
revoke all on function public.ensure_registered_profile(text) from public;
revoke all on function public.ensure_registered_profile(text) from anon;
grant execute on function public.ensure_registered_profile(text) to authenticated;
