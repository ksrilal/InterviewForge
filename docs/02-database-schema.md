# Database Schema — Supabase / Postgres

## Design principles

- Single user → no `users`/`accounts`/`orgs` tables. One `app_config` row (or pure env vars) holds the credential; everything else is just "the data," unscoped.
- RLS is enabled on every table but policies grant access only to the `service_role` key, which is the only key the app server uses (Server Actions run server-side). The anon/public key is never exposed — there is no client-side Supabase usage. This avoids needing real per-row auth logic while still following Supabase best practice of RLS-on-by-default.
- JSONB used deliberately for AI-shaped, schema-fluid data (rubrics, evaluation breakdowns, follow-up trees) — not as a dumping ground. Anything queried/filtered/aggregated relationally is a real column.
- All tables have `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`. Mutable tables also get `updated_at` + a trigger.

## Entity overview

```
questions ──< session_questions >── sessions
                    │
                    ▼
                 answers
                    │
                    ▼
            skill_score_events
                    │
                    ▼
              skill_snapshots (materialized rollups)

training_plans (derived from skill_snapshots)
```

## DDL

```sql
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
  category text not null,                  -- e.g. "Databases"
  topic text not null,                     -- e.g. "N+1 Problem"
  question_type question_type not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  level interview_level not null,
  interview_types interview_type[] not null,   -- a question can apply to multiple types
  skill_axes skill_axis[] not null,            -- which radar axes this question scores
  prompt text not null,                        -- the actual question text
  expected_answer_areas jsonb not null,        -- string[] of key points a good answer hits
  common_mistakes jsonb not null default '[]', -- string[]
  follow_up_seeds jsonb not null default '[]', -- string[] canned follow-ups AI can use/adapt
  scoring_rubric jsonb not null,               -- { accuracy: "...", depth: "...", ... } band descriptions
  source text not null default 'seed' check (source in ('seed','ai_generated','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_questions_level_type on questions (level) include (interview_types);
create index idx_questions_skill_axes on questions using gin (skill_axes);
create index idx_questions_interview_types on questions using gin (interview_types);

-- ============================================================
-- SESSIONS (an interview run — practice thread or timed mock)
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  mode session_mode not null,
  level interview_level not null,
  interview_type interview_type not null,
  status session_status not null default 'in_progress',
  time_limit_seconds integer,              -- null for untimed practice
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  overall_score numeric(5,2),              -- 0-100, set on completion
  verdict session_verdict,                 -- set on completion, mock modes only
  ai_provider text,                        -- which provider ran this session ('anthropic'|'openai')
  ai_model text,
  summary jsonb,                           -- { strengths, weaknesses, missing_concepts, narrative }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_status on sessions (status);
create index idx_sessions_started_at on sessions (started_at desc);

-- ============================================================
-- SESSION_QUESTIONS (the ordered thread of Q within a session,
-- including follow-ups — a follow-up is its own row referencing
-- its parent thread root)
-- ============================================================
create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id uuid references questions(id) on delete set null, -- null if purely ad-hoc follow-up
  parent_session_question_id uuid references session_questions(id) on delete cascade, -- set if this is a follow-up
  thread_position smallint not null,        -- order within the session
  follow_up_depth smallint not null default 0, -- 0 = root question, 1-3 = follow-up depth
  prompt_text text not null,                -- resolved question text shown to user (root or AI-generated follow-up)
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

  -- evaluation (nullable until AI evaluation completes — answer is saved first, see PRD §7)
  evaluated_at timestamptz,
  overall_score numeric(5,2),
  accuracy_score numeric(5,2),
  depth_score numeric(5,2),
  completeness_score numeric(5,2),
  practicality_score numeric(5,2),
  communication_score numeric(5,2),
  seniority_score numeric(5,2),
  strengths jsonb,                  -- string[]
  weaknesses jsonb,                 -- string[]
  missing_concepts jsonb,           -- string[]
  suggested_answer text,
  interviewer_feedback text,
  evaluation_error text,            -- set if AI eval failed, for retry UX

  ai_provider text,
  ai_model text,
  created_at timestamptz not null default now()
);

create index idx_answers_session_question on answers (session_question_id);
create index idx_answers_evaluated_at on answers (evaluated_at);

-- ============================================================
-- SKILL SCORE EVENTS (append-only, one per evaluated answer,
-- fanned out per skill_axis the question touched)
-- ============================================================
create table skill_score_events (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references answers(id) on delete cascade,
  skill_axis skill_axis not null,
  score numeric(5,2) not null,
  level interview_level not null,    -- level the question was asked at, for weighting
  occurred_at timestamptz not null default now()
);

create index idx_skill_events_axis_time on skill_score_events (skill_axis, occurred_at desc);

-- ============================================================
-- SKILL SNAPSHOTS (periodic rollup, written by a server action
-- after each session completes — avoids recomputing radar from
-- full event history on every page load)
-- ============================================================
create table skill_snapshots (
  id uuid primary key default gen_random_uuid(),
  skill_axis skill_axis not null,
  rolling_average numeric(5,2) not null,   -- recency-weighted avg, last 20 events
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
  focus_skills jsonb not null,        -- skill_axis[] ranked weakest-first
  daily_tasks jsonb not null,         -- [{ day, tasks: string[] }]
  weekly_goal text not null,
  readiness_estimate jsonb,           -- { score_now, score_target, projected_ready_date }
  is_active boolean not null default true
);

create unique index uq_one_active_plan on training_plans (is_active) where is_active;

-- ============================================================
-- updated_at trigger (questions, sessions)
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
-- RLS — service_role only (app server is the sole client)
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
```

## Why no `users` table

The brief is explicit: one user, env-var credential check. Adding a `users` table would be modeling a concept that doesn't exist in this product. If multi-user is ever needed (see [14-scaling-strategy.md](14-scaling-strategy.md)), the migration path is: add `user_id uuid` to every table with a default pointing at a migrated single-row user, then turn on real RLS. Not needed now — would be premature.

## Why `session_questions` is separate from `answers`

A question can be asked and not yet answered (mid-session), and the adaptive follow-up engine needs to read "what was asked" independent of "what was answered" to decide the next probe. Keeping them separate also cleanly models follow-ups as their own rows with `parent_session_question_id`, so the full interrogation tree for a topic is reconstructable for the session summary.

## Why `skill_score_events` + `skill_snapshots` instead of just aggregating on read

Nine skill axes × potentially hundreds of answers is cheap to aggregate live, honestly — this is not a scale concern. The snapshot table exists for one reason: the Skill Radar's trend-over-time chart needs historical points ("what was my Architecture score 3 weeks ago"), which a live aggregate query can't reconstruct after the fact. Snapshots are written once per completed session, not on a cron — no background jobs needed for MVP.

## Seed data strategy

Ship a `supabase/seed.sql` (or a one-time seed Server Action) with ~150–250 hand-curated questions covering all 15 knowledge areas from the brief, weighted toward the high-priority topics (SOLID, design patterns, .NET/EF, REST/API design, caching, system design scenarios). This is generated content, written once, reviewed for quality, then treated as static seed — not maintained as "code," tracked as a SQL/JSON fixture in `supabase/seed/`.
