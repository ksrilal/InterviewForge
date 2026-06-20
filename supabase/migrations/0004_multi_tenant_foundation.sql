-- Multi-tenant pivot: Supabase Auth (Google) replaces the single hardcoded
-- user, and real per-user RLS replaces the old service-role-only policies.
-- See docs/00-overview.md and the "InterviewForge v2" plan for rationale.
--
-- This is a fresh-start migration: existing sessions/answers/skill history/
-- training plans have no owner and are dropped rather than backfilled. The
-- seeded question bank is untouched.
--
-- Written to be safely re-runnable (IF [NOT] EXISTS / drop-then-create
-- guards throughout) in case it fails partway through and needs a retry.

-- ============================================================
-- FRESH START: drop data that has no user to attribute it to
-- ============================================================
truncate table sessions, skill_snapshots, training_plans cascade;

-- ============================================================
-- DOMAINS (data scaffold for future multi-domain expansion -
-- only Software Engineering has real content for now). Postgres column
-- DEFAULTs can't contain subqueries, so the seed row uses a fixed literal
-- id instead of gen_random_uuid() - that same literal is then usable as a
-- plain default on questions.domain_id / sessions.domain_id below.
-- ============================================================
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true
);

insert into domains (id, slug, name, description)
values (
  '11111111-1111-1111-1111-111111111111',
  'software-engineering',
  'Software Engineering',
  'Backend, architecture, system design, cloud, DevOps, and behavioral interview prep for software engineers.'
)
on conflict (slug) do nothing;

-- ============================================================
-- PROFILES (one row per Supabase Auth user, auto-created on signup)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  target_level interview_level,
  target_date date,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- QUESTIONS: scope to a domain, allow user-owned (private) rows
-- alongside the shared/global bank (owner_user_id null = global)
-- ============================================================
alter table questions
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists domain_id uuid not null references domains(id)
    default '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- SESSIONS / TRAINING_PLANS / SKILL_SNAPSHOTS / SKILL_SCORE_EVENTS:
-- add the owning user. Defaulting to auth.uid() means app code doesn't
-- need to pass user_id explicitly on insert - it's only ever inserted via
-- the user-scoped client (src/lib/supabase/server.ts), never service-role.
-- ============================================================
alter table sessions
  add column if not exists user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists domain_id uuid not null references domains(id)
    default '11111111-1111-1111-1111-111111111111';

alter table training_plans
  add column if not exists user_id uuid not null references auth.users(id) on delete cascade default auth.uid();

alter table skill_snapshots
  add column if not exists user_id uuid not null references auth.users(id) on delete cascade default auth.uid();

alter table skill_score_events
  add column if not exists user_id uuid not null references auth.users(id) on delete cascade default auth.uid();

create index if not exists idx_sessions_user on sessions (user_id, started_at desc);
create index if not exists idx_training_plans_user on training_plans (user_id) where is_active;
create index if not exists idx_skill_snapshots_user_axis on skill_snapshots (user_id, skill_axis, snapshot_at desc);
create index if not exists idx_skill_events_user_axis on skill_score_events (user_id, skill_axis, occurred_at desc);

-- ============================================================
-- RLS rewrite: drop the old service-role-only policies, replace with
-- per-user ownership checks. session_questions/answers have no user_id of
-- their own (see plan rationale - they're never queried independent of
-- their session), so their policies join back to sessions.user_id.
-- ============================================================
drop policy if exists service_role_all on sessions;
drop policy if exists service_role_all on session_questions;
drop policy if exists service_role_all on answers;
drop policy if exists service_role_all on skill_score_events;
drop policy if exists service_role_all on skill_snapshots;
drop policy if exists service_role_all on training_plans;

-- questions: keep the seed script's service-role policy (it never runs as
-- an authenticated user), add per-user read/write for the shared + private bank.
drop policy if exists authenticated_read_questions on questions;
create policy authenticated_read_questions on questions for select
  using (auth.role() = 'authenticated' and (owner_user_id is null or owner_user_id = auth.uid()));

drop policy if exists authenticated_insert_questions on questions;
create policy authenticated_insert_questions on questions for insert
  with check (auth.role() = 'authenticated' and (owner_user_id is null or owner_user_id = auth.uid()));

drop policy if exists owner_all_sessions on sessions;
create policy owner_all_sessions on sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists owner_all_training_plans on training_plans;
create policy owner_all_training_plans on training_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists owner_all_skill_snapshots on skill_snapshots;
create policy owner_all_skill_snapshots on skill_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists owner_all_skill_score_events on skill_score_events;
create policy owner_all_skill_score_events on skill_score_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists owner_all_session_questions on session_questions;
create policy owner_all_session_questions on session_questions for all
  using (exists (select 1 from sessions s where s.id = session_questions.session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_questions.session_id and s.user_id = auth.uid()));

drop policy if exists owner_all_answers on answers;
create policy owner_all_answers on answers for all
  using (exists (
    select 1 from session_questions sq
    join sessions s on s.id = sq.session_id
    where sq.id = answers.session_question_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from session_questions sq
    join sessions s on s.id = sq.session_id
    where sq.id = answers.session_question_id and s.user_id = auth.uid()
  ));

-- profiles / domains
alter table profiles enable row level security;
alter table domains enable row level security;

drop policy if exists owner_all_profiles on profiles;
create policy owner_all_profiles on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists authenticated_read_domains on domains;
create policy authenticated_read_domains on domains for select
  using (auth.role() = 'authenticated');

-- Authenticated (anon-key + user JWT) clients need SQL-level privileges too,
-- same reasoning as 0002_grant_service_role.sql for service_role.
grant usage on schema public to authenticated;
grant select, insert, update, delete on questions, sessions, session_questions, answers,
  skill_score_events, skill_snapshots, training_plans, profiles to authenticated;
grant select on domains to authenticated;
