-- Coding Workspace feature: lets a question require writing code (Monaco
-- editor) instead of free text, reviewed by AI as a static read-through -
-- never claimed as compiled/executed. See docs/06-ai-prompt-architecture.md
-- conventions: this adds a parallel review pipeline alongside the existing
-- text-answer evaluation, not a replacement for it.

alter type question_type add value if not exists 'coding';

-- Which language a coding question is written for (e.g. "python",
-- "csharp", "typescript"). Nullable - only meaningful when question_type =
-- 'coding'; every other question type leaves this null.
alter table questions add column if not exists language text;

-- Tags whether an answer is free text or a code submission, so
-- evaluateAnswer's caller can route to the code-review pipeline without
-- re-deriving it from the question. Defaults to 'text' for every existing
-- and non-coding answer.
alter table answers
  add column if not exists answer_kind text not null default 'text'
    check (answer_kind in ('text', 'code')),
  add column if not exists answer_language text,
  add column if not exists code_review jsonb;
