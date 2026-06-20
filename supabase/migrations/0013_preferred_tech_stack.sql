-- Coding Workspace feature: lets a user state their preferred languages and
-- frameworks/tools (e.g. C#, Angular, .NET, PostgreSQL) so AI-generated
-- coding questions can be biased toward their actual stack instead of a
-- random language pick. Surfaced on the Settings page.

-- Free text, not the questions.language enum-like column - a user might
-- list more languages than the fixed CodeLanguage union covers, and this is
-- a preference signal for prompts, not a strict filter.
alter table profiles add column if not exists preferred_languages text[] not null default '{}';

-- Frameworks/tools/databases named alongside a language (Angular, .NET,
-- PostgreSQL, React, etc.) - free text since this list has no fixed
-- vocabulary anywhere else in the schema.
alter table profiles add column if not exists preferred_frameworks text[] not null default '{}';
