-- Skill radar / readiness score were never domain-scoped - every session,
-- regardless of which domain it was practiced in, fed the same global
-- per-user skill_axis pool. That silently blends unrelated domains together
-- (a "Senior Backend" session and an "Interior Designer" session would
-- contribute to the exact same skill radar), which stopped making sense
-- once domains became user-creatable and unrelated to each other.
--
-- Written to be safely re-runnable, same as 0004-0008.

alter table skill_score_events
  add column if not exists domain_id uuid not null references domains(id)
    default '11111111-1111-1111-1111-111111111111';

alter table skill_snapshots
  add column if not exists domain_id uuid not null references domains(id)
    default '11111111-1111-1111-1111-111111111111';

create index if not exists idx_skill_events_user_domain_axis
  on skill_score_events (user_id, domain_id, skill_axis, occurred_at desc);
create index if not exists idx_skill_snapshots_user_domain_axis
  on skill_snapshots (user_id, domain_id, skill_axis, snapshot_at desc);
