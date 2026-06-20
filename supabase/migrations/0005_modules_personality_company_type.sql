-- Phase 1: domain-pluggable modules table, interviewer personality, and
-- company-type-aware questioning. See the "InterviewForge v2" plan's "Key
-- architecture decision" section for rationale: `interview_type` stays a
-- Postgres enum and every existing query keeps using it unchanged - `modules`
-- is a new, additive, data-driven selection surface for features (custom
-- tracks, Phase 2) that need a domain-scoped list instead of a hardcoded
-- enum, so a future domain can register its own modules with zero enum or
-- code changes.
--
-- Written to be safely re-runnable, same as 0004.

-- ============================================================
-- MODULES
-- ============================================================
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  unique (domain_id, slug)
);

insert into modules (domain_id, slug, name, description)
select '11111111-1111-1111-1111-111111111111', seed.slug, seed.name, seed.description
from (values
  ('backend', 'Backend', 'APIs, services, data access, performance'),
  ('full_stack', 'Full Stack', 'End-to-end feature delivery across frontend and backend'),
  ('dotnet', '.NET', 'ASP.NET Core, EF Core, the .NET ecosystem'),
  ('architecture', 'Architecture', 'Design patterns, SOLID, structuring systems'),
  ('system_design', 'System Design', 'Scalability, distributed systems, tradeoffs'),
  ('cloud', 'Cloud', 'Azure/AWS/GCP, infrastructure, managed services'),
  ('devops', 'DevOps', 'CI/CD, observability, deployment practices'),
  ('behavioral', 'Behavioral', 'STAR-format, leadership, conflict, communication'),
  ('ai', 'AI', 'AI-assisted engineering, LLM integration, prompt engineering')
) as seed(slug, name, description)
on conflict (domain_id, slug) do nothing;

alter table modules enable row level security;
drop policy if exists authenticated_read_modules on modules;
create policy authenticated_read_modules on modules for select
  using (auth.role() = 'authenticated');
grant select on modules to authenticated;

-- ============================================================
-- INTERVIEWER PERSONALITY + COMPANY TYPE (session-level, prompt-only -
-- affects tone/follow-up aggressiveness/feedback style, never grading
-- rigor; see src/ai/prompts/interviewer.prompt.ts)
-- ============================================================
do $$ begin
  create type interviewer_personality as enum (
    'supportive_mentor', 'professional', 'strict_senior', 'tough_reviewer', 'faang_interviewer'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type company_type as enum (
    'startup', 'enterprise', 'product', 'faang', 'remote_first'
  );
exception when duplicate_object then null;
end $$;

alter table sessions
  add column if not exists interviewer_personality interviewer_personality not null default 'professional',
  add column if not exists company_type company_type;
