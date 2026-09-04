-- Request-based account deletion intake for Google Play compliance.
-- Actual destructive deletion remains operator-controlled after verification.

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'account_deletion_request_status'
  ) then
    create type public.account_deletion_request_status as enum ('pending', 'verified', 'completed', 'rejected', 'cancelled');
  end if;
end
$$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null,
  status public.account_deletion_request_status not null default 'pending',
  source text not null default 'web',
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint account_deletion_requests_email_normalized
    check (normalized_email = lower(btrim(normalized_email))),
  constraint account_deletion_requests_email_length
    check (length(normalized_email) between 3 and 320),
  constraint account_deletion_requests_email_shape
    check (normalized_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint account_deletion_requests_source_check
    check (source in ('web', 'mobile')),
  constraint account_deletion_requests_processed_status
    check (
      (processed_at is null and status in ('pending', 'verified'))
      or (processed_at is not null and status in ('completed', 'rejected', 'cancelled'))
    )
);

create unique index if not exists account_deletion_requests_pending_email_uidx
  on public.account_deletion_requests (normalized_email)
  where status in ('pending', 'verified');

create index if not exists account_deletion_requests_status_requested_idx
  on public.account_deletion_requests (status, requested_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_account_deletion_requests_updated_at'
  ) then
    create trigger set_account_deletion_requests_updated_at
    before update on public.account_deletion_requests
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.account_deletion_requests enable row level security;

revoke all on table public.account_deletion_requests from public;
revoke all on table public.account_deletion_requests from anon;
revoke all on table public.account_deletion_requests from authenticated;

grant insert on table public.account_deletion_requests to service_role;
