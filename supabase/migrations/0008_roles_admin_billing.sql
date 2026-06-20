-- Adds two roles (candidate/admin, default candidate - admin is assigned by
-- hand directly in the DB, no signup flow for it), a 5-request AI trial per
-- user with an admin-controlled full-access switch, per-call token/cost
-- tracking for an admin-only billing view, and account disable.
--
-- Written to be safely re-runnable, same as 0004-0007.

do $$ begin
  create type user_role as enum ('candidate', 'admin');
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists role user_role not null default 'candidate',
  add column if not exists ai_trial_limit int not null default 5,
  add column if not exists ai_access_enabled boolean not null default false,
  add column if not exists ai_request_count int not null default 0,
  add column if not exists is_disabled boolean not null default false;

-- These columns must never be writable by a user's own session - only an
-- admin (via the service-role client, which bypasses grants entirely) or
-- the narrow increment_ai_request_count() RPC below may change them. The
-- table-level grant in 0004 included UPDATE on profiles, so this carves the
-- privileged columns back out of it.
revoke update (role, ai_trial_limit, ai_access_enabled, ai_request_count, is_disabled)
  on profiles from authenticated;

-- SECURITY DEFINER so it can read profiles.role regardless of the caller's
-- own RLS visibility, without recursively re-checking the policy that uses it.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Admins need to read every profile for the Users page; the existing
-- owner_all_profiles policy (auth.uid() = id) already covers self-access.
drop policy if exists admin_select_profiles on profiles;
create policy admin_select_profiles on profiles for select
  using (is_admin());

-- Lets a user's own session record exactly one more AI request against
-- their own row without being able to set/reset the count to anything else
-- (the function body only ever adds 1).
create or replace function increment_ai_request_count()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set ai_request_count = ai_request_count + 1 where id = auth.uid();
end;
$$;
grant execute on function increment_ai_request_count() to authenticated;

-- ============================================================
-- AI USAGE / BILLING
-- ============================================================
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_user on ai_usage_events (user_id, created_at);

alter table ai_usage_events enable row level security;

-- Admin-only read (this is the data behind the Users page's usage/bill
-- columns) - individual users don't have a billing view of their own.
drop policy if exists admin_select_ai_usage_events on ai_usage_events;
create policy admin_select_ai_usage_events on ai_usage_events for select
  using (is_admin());

-- A session can only ever log usage against itself.
drop policy if exists owner_insert_ai_usage_events on ai_usage_events;
create policy owner_insert_ai_usage_events on ai_usage_events for insert
  with check (auth.uid() = user_id);

grant select, insert on ai_usage_events to authenticated;
