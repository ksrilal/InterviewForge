-- Bug: deleteDomain() (domain.actions.ts) only deleted the domain's
-- questions before deleting the domain row itself, then let Postgres
-- error out with a raw FK violation message shown directly to the user
-- ("violates foreign key constraint sessions_domain_id_fkey") whenever the
-- domain had any sessions, skill_score_events, or skill_snapshots against
-- it - which is the normal case for any domain that's actually been used.
--
-- None of sessions.domain_id / skill_score_events.domain_id /
-- skill_snapshots.domain_id / questions.domain_id were ever given
-- ON DELETE CASCADE (0004/0009), unlike knowledge_sources/modules which
-- already cascade correctly. Fixing the FKs here means a domain delete is
-- a single atomic `delete from domains` - no more manual multi-table
-- cleanup in app code to get right.
--
-- Written to be safely re-runnable, same as 0004-0013.

alter table questions drop constraint if exists questions_domain_id_fkey;
alter table questions
  add constraint questions_domain_id_fkey foreign key (domain_id) references domains(id) on delete cascade;

alter table sessions drop constraint if exists sessions_domain_id_fkey;
alter table sessions
  add constraint sessions_domain_id_fkey foreign key (domain_id) references domains(id) on delete cascade;

alter table skill_score_events drop constraint if exists skill_score_events_domain_id_fkey;
alter table skill_score_events
  add constraint skill_score_events_domain_id_fkey foreign key (domain_id) references domains(id) on delete cascade;

alter table skill_snapshots drop constraint if exists skill_snapshots_domain_id_fkey;
alter table skill_snapshots
  add constraint skill_snapshots_domain_id_fkey foreign key (domain_id) references domains(id) on delete cascade;
