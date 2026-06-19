-- Redirect from 0005/0006: Modules are removed entirely (unused, per direct
-- feedback after shipping them), and Domains become user-creatable instead.
-- A user-created domain is private to its creator (resumes/JDs are personal
-- content) - the seeded `software-engineering` domain stays global exactly
-- as it is today. Domain creation is also where knowledge ingestion lives:
-- paste text or upload markdown/PDF, extracted to text once and sent to the
-- AI to generate a categorized set of questions for that domain.
--
-- Written to be safely re-runnable, same as 0004-0006.

-- ============================================================
-- DROP MODULES (clean reversal of 0005/0006's module pieces)
-- ============================================================
drop policy if exists authenticated_read_modules on modules;
drop policy if exists authenticated_insert_modules on modules;
alter table questions drop column if exists module_id;
drop table if exists modules;

-- ============================================================
-- DOMAINS BECOME OWNABLE (null = global/seed, like today's row)
-- ============================================================
alter table domains
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

drop policy if exists authenticated_read_domains on domains;
create policy authenticated_read_domains on domains for select
  using (auth.role() = 'authenticated' and (owner_user_id is null or owner_user_id = auth.uid()));

drop policy if exists owner_insert_domains on domains;
create policy owner_insert_domains on domains for insert
  with check (auth.role() = 'authenticated' and owner_user_id = auth.uid());

drop policy if exists owner_update_domains on domains;
create policy owner_update_domains on domains for update
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists owner_delete_domains on domains;
create policy owner_delete_domains on domains for delete
  using (owner_user_id = auth.uid());

grant insert, update, delete on domains to authenticated;

-- Questions previously had no delete policy at all (RLS default-denies
-- without one, regardless of GRANTs). Needed so a user can delete their own
-- private AI-generated questions, which deleting a private domain requires
-- (questions.domain_id has no ON DELETE CASCADE).
drop policy if exists owner_delete_questions on questions;
create policy owner_delete_questions on questions for delete
  using (owner_user_id = auth.uid());

-- ============================================================
-- KNOWLEDGE INGESTION
-- ============================================================
create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  domain_id uuid not null references domains(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'markdown', 'pdf')),
  title text not null,
  storage_path text,
  extracted_text text,
  content_hash text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_sources_domain on knowledge_sources (domain_id);

alter table knowledge_sources enable row level security;
drop policy if exists owner_all_knowledge_sources on knowledge_sources;
create policy owner_all_knowledge_sources on knowledge_sources for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on knowledge_sources to authenticated;

create table if not exists knowledge_source_questions (
  source_id uuid not null references knowledge_sources(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  primary key (source_id, question_id)
);

alter table knowledge_source_questions enable row level security;
drop policy if exists owner_all_knowledge_source_questions on knowledge_source_questions;
create policy owner_all_knowledge_source_questions on knowledge_source_questions for all
  using (exists (
    select 1 from knowledge_sources ks
    where ks.id = knowledge_source_questions.source_id and ks.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from knowledge_sources ks
    where ks.id = knowledge_source_questions.source_id and ks.user_id = auth.uid()
  ));
grant select, insert, update, delete on knowledge_source_questions to authenticated;

-- ============================================================
-- STORAGE: private bucket for uploaded resumes/JDs/markdown, path-prefixed
-- per user (standard Supabase Storage RLS pattern)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('domain-uploads', 'domain-uploads', false)
on conflict (id) do nothing;

drop policy if exists "domain_uploads_owner_all" on storage.objects;
create policy "domain_uploads_owner_all" on storage.objects for all
  using (bucket_id = 'domain-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'domain-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
