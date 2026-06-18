-- InterviewForge initial schema
-- See docs/02-database-schema.md for full rationale.
-- Single-user app: no users table, RLS scoped to service_role only.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
create type interview_level as enum ('junior','mid','senior','staff','tech_lead');

create type interview_type as enum (
  'backend','full_stack','dotnet','architecture','system_design',
  'cloud','devops','behavioral'
);

create type question_type as enum (
  'theory','scenario','debugging','architecture','system_design','behavioral'
);

create type session_mode as enum ('practice','mock_15','mock_30','mock_60');

create type session_status as enum ('in_progress','completed','abandoned');

create type session_verdict as enum ('pass','borderline','fail');

create type skill_axis as enum (
  'architecture','system_design','databases','security',
  'backend','cloud','devops','leadership','communication'
);

-- ============================================================
-- QUESTION BANK
-- ============================================================
create table questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  topic text not null,
  question_type question_type not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  level interview_level not null,
  interview_types interview_type[] not null,
  skill_axes skill_axis[] not null,
  prompt text not null,
  expected_answer_areas jsonb not null,
  common_mistakes jsonb not null default '[]',
  follow_up_seeds jsonb not null default '[]',
  scoring_rubric jsonb not null,
  source text not null default 'seed' check (source in ('seed','ai_generated','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_questions_level_type on questions (level) include (interview_types);
create index idx_questions_skill_axes on questions using gin (skill_axes);
create index idx_questions_interview_types on questions using gin (interview_types);

-- ============================================================
-- SESSIONS
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  mode session_mode not null,
  level interview_level not null,
  interview_type interview_type not null,
  status session_status not null default 'in_progress',
  time_limit_seconds integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  overall_score numeric(5,2),
  verdict session_verdict,
  ai_provider text,
  ai_model text,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_status on sessions (status);
create index idx_sessions_started_at on sessions (started_at desc);

-- ============================================================
-- SESSION_QUESTIONS
-- ============================================================
create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  parent_session_question_id uuid references session_questions(id) on delete cascade,
  thread_position smallint not null,
  follow_up_depth smallint not null default 0,
  prompt_text text not null,
  asked_at timestamptz not null default now()
);

create index idx_session_questions_session on session_questions (session_id, thread_position);
create index idx_session_questions_parent on session_questions (parent_session_question_id);

-- ============================================================
-- ANSWERS
-- ============================================================
create table answers (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null references session_questions(id) on delete cascade,
  answer_text text not null,
  submitted_at timestamptz not null default now(),

  evaluated_at timestamptz,
  overall_score numeric(5,2),
  accuracy_score numeric(5,2),
  depth_score numeric(5,2),
  completeness_score numeric(5,2),
  practicality_score numeric(5,2),
  communication_score numeric(5,2),
  seniority_score numeric(5,2),
  strengths jsonb,
  weaknesses jsonb,
  missing_concepts jsonb,
  suggested_answer text,
  interviewer_feedback text,
  evaluation_error text,

  ai_provider text,
  ai_model text,
  created_at timestamptz not null default now()
);

create index idx_answers_session_question on answers (session_question_id);
create index idx_answers_evaluated_at on answers (evaluated_at);

-- ============================================================
-- SKILL SCORE EVENTS
-- ============================================================
create table skill_score_events (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references answers(id) on delete cascade,
  skill_axis skill_axis not null,
  score numeric(5,2) not null,
  level interview_level not null,
  occurred_at timestamptz not null default now()
);

create index idx_skill_events_axis_time on skill_score_events (skill_axis, occurred_at desc);

-- ============================================================
-- SKILL SNAPSHOTS
-- ============================================================
create table skill_snapshots (
  id uuid primary key default gen_random_uuid(),
  skill_axis skill_axis not null,
  rolling_average numeric(5,2) not null,
  sample_count integer not null,
  snapshot_at timestamptz not null default now()
);

create index idx_skill_snapshots_axis_time on skill_snapshots (skill_axis, snapshot_at desc);

-- ============================================================
-- TRAINING PLANS
-- ============================================================
create table training_plans (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  target_level interview_level,
  target_date date,
  focus_skills jsonb not null,
  daily_tasks jsonb not null,
  weekly_goal text not null,
  readiness_estimate jsonb,
  is_active boolean not null default true
);

create unique index uq_one_active_plan on training_plans (is_active) where is_active;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_questions_updated_at before update on questions
  for each row execute function set_updated_at();
create trigger trg_sessions_updated_at before update on sessions
  for each row execute function set_updated_at();

-- ============================================================
-- RLS — service_role only
-- ============================================================
alter table questions enable row level security;
alter table sessions enable row level security;
alter table session_questions enable row level security;
alter table answers enable row level security;
alter table skill_score_events enable row level security;
alter table skill_snapshots enable row level security;
alter table training_plans enable row level security;

create policy service_role_all on questions for all using (auth.role() = 'service_role');
create policy service_role_all on sessions for all using (auth.role() = 'service_role');
create policy service_role_all on session_questions for all using (auth.role() = 'service_role');
create policy service_role_all on answers for all using (auth.role() = 'service_role');
create policy service_role_all on skill_score_events for all using (auth.role() = 'service_role');
create policy service_role_all on skill_snapshots for all using (auth.role() = 'service_role');
create policy service_role_all on training_plans for all using (auth.role() = 'service_role');

-- RLS policies only take effect once the role already holds the underlying
-- SQL privilege - Postgres does not grant table access by default, so
-- service_role needs explicit grants here or every query 403s with
-- "permission denied for table X" regardless of the policies above.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
