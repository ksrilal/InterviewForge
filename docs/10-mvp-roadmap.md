# MVP Roadmap

## Phasing philosophy

MVP = the smallest version that lets the user run a real practice interview end-to-end and see a score. Everything else is additive. Phases are ordered so each one is independently shippable/usable — you should be able to stop after any phase and have a working (if smaller) tool.

## Phase 0 — Foundation (no user-visible features)

- Next.js app scaffold, Tailwind, ShadCN init, Supabase project + migration applied, env vars wired.
- Auth: login page, session cookie, middleware guard.
- `AIProvider` interface + both provider implementations + Zod response schemas (no UI consumes them yet — verified via a temporary script/test call).

**Exit criterion**: can log in, gets redirected to an empty `/dashboard`, and a manual script call to `getAIProvider().evaluateAnswer(...)` returns a validated result from whichever provider is active.

## Phase 1 — Core Interview Loop (Modules 1, 2, 3 minimum)

- Question bank seeded (~150-250 questions across all 15 knowledge areas).
- `/interview/new` setup form (Practice mode only — mock timers deferred to Phase 3).
- `/interview/[sessionId]` live screen: question display, answer submit, evaluation display. **No follow-up engine yet** — one question per topic, then move to next root question.
- Session summary page.

**Exit criterion**: full practice session (5-8 questions, no follow-ups) can be run start to finish, scores persist, summary is readable. **This phase alone is already useful** — it's "AI quizzes me and grades me."

## Phase 2 — Adaptive Follow-Up Engine (Module 4)

- `decideFollowUp` wired into the session loop.
- Thread depth tracking, follow-up cap enforcement, escalating difficulty prompt logic.
- UI: `ThreadProgress` showing depth, summary page shows nested thread tree.

**Exit criterion**: a single topic can spawn up to 3 follow-ups before moving on, and the questions visibly get harder/deeper within a thread.

## Phase 3 — Skill Radar + Mock Interviews (Modules 5, 6)

- `skill_score_events` + `skill_snapshots` writing on session completion.
- `/radar` page with Recharts radar + trend charts.
- Mock modes (15/30/60) with timer, question-mix templates, Pass/Borderline/Fail verdict logic.
- Dashboard readiness score card wired to real data (was a placeholder before this phase).

**Exit criterion**: can run a timed mock, get a verdict, and see it reflected in the radar.

## Phase 4 — Training Plan (Module 7)

- `generateTrainingPlan` Server Action + prompt.
- `/plan` page.

**Exit criterion**: after 3+ sessions, a coherent, specific (not generic) plan is generated.

## Phase 5 — Polish & resilience

- AI failure retry/fallback flow (Flow 8 in [08-user-flows.md](08-user-flows.md)) — note: the *answer-saved-before-eval* part of this should actually be built in Phase 1, not deferred; only the cross-provider fallback and polished retry UX are genuinely deferrable here.
- Question bank browser UI (`/questions`) — AI generation was usable headlessly earlier; this phase adds the human browsing UI.
- Mobile pass: real device testing, sticky submit button above keyboard, chart legibility at small sizes.
- Loading/error states (`loading.tsx`/`error.tsx`) per route.

## Explicitly deferred past MVP (see [14-scaling-strategy.md](14-scaling-strategy.md) for if/when)

- Voice/video interview mode.
- Code-execution sandbox for debugging-type questions.
- Multi-user/auth provider upgrade.
- Light/dark theme toggle.
- Community/shared question submission.
- Editable AI provider/model settings UI (env-var only is fine for a single self-hosted user).

## Correction to the brief's deliverable ordering

The original ask lists "Sprint Breakdown" and "Development Tasks" as late deliverables, but logically the roadmap above already implies them — [11-development-tasks.md](11-development-tasks.md) and [12-sprint-breakdown.md](12-sprint-breakdown.md) simply operationalize these five phases into discrete tickets and sprint-sized chunks. No separate prioritization decision is needed there; they inherit this ordering.
