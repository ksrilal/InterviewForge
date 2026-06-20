-- Closes a gap from 0005: `modules` existed in the schema but had no
-- user-insert policy and no link from `questions`, so it was invisible in
-- the UI. This makes modules user-creatable (shared, like the question
-- bank itself) and links existing questions to a module so the Question
-- Bank can actually be browsed/filtered module-wise.
--
-- Written to be safely re-runnable, same as 0004/0005.

alter table modules
  add column if not exists created_by_user_id uuid references auth.users(id) on delete cascade;

drop policy if exists authenticated_insert_modules on modules;
create policy authenticated_insert_modules on modules for insert
  with check (auth.role() = 'authenticated' and created_by_user_id = auth.uid());
grant insert on modules to authenticated;

alter table questions
  add column if not exists module_id uuid references modules(id);

create index if not exists idx_questions_module on questions (module_id);

-- Best-effort backfill: map each question's first interview_type to the
-- matching seeded module within its domain. New questions/modules created
-- from here on are linked explicitly by app code, not by this heuristic.
update questions q
set module_id = m.id
from modules m
where q.module_id is null
  and m.domain_id = q.domain_id
  and m.slug = q.interview_types[1]::text;
