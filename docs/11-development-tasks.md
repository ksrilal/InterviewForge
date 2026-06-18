# Development Tasks

Concrete, ticket-sized tasks grouped by the phases in [10-mvp-roadmap.md](10-mvp-roadmap.md). Each task is scoped to be completable independently and reviewable on its own.

## Phase 0 — Foundation

- [ ] T001 — Scaffold Next.js (App Router, TS) project, Tailwind, ShadCN init (`components.json`, base theme).
- [ ] T002 — Create Supabase project, write `supabase/migrations/0001_init.sql` from [02-database-schema.md](02-database-schema.md), apply it.
- [ ] T003 — `lib/supabase/server.ts` service-role client + generate `lib/supabase/types.ts` via `supabase gen types typescript`.
- [ ] T004 — `lib/auth/session.ts` (sign/verify HMAC session token), `actions/auth.actions.ts` (login/logout), `/login` page, `middleware.ts` guard on `(app)` group.
- [ ] T005 — `ai/schemas/ai-response.schemas.ts` Zod schemas for Evaluation, FollowUpDecision, GeneratedQuestion, TrainingPlan.
- [ ] T006 — `ai/provider.ts` interface + factory reading `ACTIVE_AI_PROVIDER`.
- [ ] T007 — `ai/providers/anthropic.provider.ts` implementing `evaluateAnswer` only (other methods stubbed/throw — filled in later phases), with schema validation + one retry-with-repair-prompt.
- [ ] T008 — `ai/providers/openai.provider.ts`, same scope as T007.
- [ ] T009 — `.env.local.example` with all required vars documented inline.

## Phase 1 — Core Interview Loop

- [ ] T010 — Author and review ~150-250 seed questions (`supabase/seed/questions.seed.json`) covering all 15 knowledge areas; load via seed script.
- [ ] T011 — `ai/prompts/evaluation.prompt.ts` + score-band constants; wire into both providers' `evaluateAnswer`.
- [ ] T012 — `actions/question.actions.ts`: `pickRootQuestion(level, type)` — random/weighted selection from bank, no repeats within a session.
- [ ] T013 — `actions/session.actions.ts`: `startSession`, `endSession` (no follow-up logic yet — straight root-question loop).
- [ ] T014 — `actions/answer.actions.ts`: `submitAnswer` — writes answer row first, then calls AI eval, updates row; returns typed result (ok/error).
- [ ] T015 — `components/interview/question-card.tsx`, `answer-input.tsx`, `evaluation-panel.tsx` (ShadCN Progress/Accordion based).
- [ ] T016 — `app/(app)/interview/new/page.tsx` + `InterviewSetupForm` (RHF + Zod), Practice mode only.
- [ ] T017 — `app/(app)/interview/[sessionId]/page.tsx` client shell wiring `interview-session.store.ts` + the above components.
- [ ] T018 — `app/(app)/interview/[sessionId]/summary/page.tsx` — server-rendered read of completed session.
- [ ] T019 — Manual end-to-end test: run a full 5-question practice session, verify DB rows at each table.

## Phase 2 — Adaptive Follow-Up Engine

- [ ] T020 — `ai/prompts/followup.prompt.ts` + `decideFollowUp` implemented in both providers.
- [ ] T021 — `actions/session.actions.ts`: extend loop to call `decideFollowUp` after each evaluation; enforce 3-follow-up cap in code (not just prompt).
- [ ] T022 — `components/interview/thread-progress.tsx` (depth indicator).
- [ ] T023 — Extend summary page to render nested thread tree (root + follow-ups grouped).
- [ ] T024 — Test: force a low-score answer and confirm a follow-up fires; force depth 3 and confirm it's forced to NEW_TOPIC.

## Phase 3 — Skill Radar + Mock Interviews

- [ ] T025 — `lib/scoring/skill-weighting.ts` (recency-weighted rolling average calc).
- [ ] T026 — On `endSession`: insert `skill_score_events`, compute + insert `skill_snapshots`.
- [ ] T027 — `actions/radar.actions.ts`: fetch latest snapshot per axis + historical series per axis.
- [ ] T028 — `components/radar/skill-radar-chart.tsx`, `skill-trend-chart.tsx` (Recharts, `ResponsiveContainer`, mobile tick simplification).
- [ ] T029 — `app/(app)/radar/page.tsx`.
- [ ] T030 — Mock mode: question-mix templates per duration, `components/interview/session-timer.tsx`, auto-end on timer expiry.
- [ ] T031 — `lib/scoring/readiness.ts`: composite readiness score + Pass/Borderline/Fail verdict incl. hard-fail override rule.
- [ ] T032 — Wire dashboard's `ReadinessScoreCard` + `RecentSessionsList` to real data.

## Phase 4 — Training Plan

- [ ] T033 — `ai/prompts/training-plan.prompt.ts` + `generateTrainingPlan` in both providers.
- [ ] T034 — `actions/plan.actions.ts`: `generatePlan` (enforces >=3 session minimum), `getActivePlan`.
- [ ] T035 — `app/(app)/plan/page.tsx` + `training-plan-card.tsx`.

## Phase 5 — Polish & Resilience

- [ ] T036 — Cross-provider fallback on eval failure (`retryEvaluation` action tries the *other* configured provider if the active one fails twice).
- [ ] T037 — `app/(app)/questions/page.tsx` + `[questionId]/page.tsx` browser UI with filters.
- [ ] T038 — `ai/prompts/question-generation.prompt.ts` + on-demand generation action + duplicate-check before insert.
- [ ] T039 — `loading.tsx` + `error.tsx` for every route segment under `(app)`.
- [ ] T040 — Mobile device pass: real iOS/Android browser test of the interview screen (keyboard overlap, sticky submit, chart legibility).
- [ ] T041 — `mobile-bottom-nav.tsx` / `nav-bar.tsx` shared nav-items wiring.

## Cross-cutting / always-on

- [ ] T042 — TypeScript strict mode on, no `any` in `ai/` or `actions/`.
- [ ] T043 — Basic Server Action input validation (Zod) on every action that takes user-controlled input, even though there's one trusted user — guards against malformed client state, not malice.
