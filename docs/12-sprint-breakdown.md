# Sprint Breakdown

Assumes a solo developer working part-time (evenings/weekends), ~1-week sprints. Adjust pace freely — the dependency order matters more than the calendar duration. Each sprint ends with something runnable.

## Sprint 1 — Foundation
**Tasks**: T001–T009
**Goal**: Project boots, login works, AI provider abstraction returns a real validated evaluation from a manual test call.
**Demo**: `npm run dev`, log in, see empty dashboard. Run a one-off script that calls `getAIProvider().evaluateAnswer(...)` against a hardcoded question/answer and prints a valid `Evaluation` object.

## Sprint 2 — Question Bank + Core Loop (part 1)
**Tasks**: T010–T014
**Goal**: Data + Server Action layer for a no-follow-up interview loop exists, no UI yet.
**Demo**: Script-level: start a session, submit 3 answers via the actions directly, confirm rows in `sessions`/`session_questions`/`answers`.

## Sprint 3 — Core Loop UI
**Tasks**: T015–T019
**Goal**: Full practice interview playable in the browser, start to finish.
**Demo**: Pick Senior/.NET/Practice, answer 5 questions, see scores after each, reach a summary page. **This is the first sprint that produces something you'd actually use for real prep.**

## Sprint 4 — Adaptive Follow-Ups
**Tasks**: T020–T024
**Goal**: Interviews feel like real interrogation, not a flat quiz.
**Demo**: Answer a question shallowly, get probed deeper on the same topic up to 3 times before moving on.

## Sprint 5 — Skill Radar + Mocks
**Tasks**: T025–T032
**Goal**: Skill tracking over time + timed mock mode with a verdict.
**Demo**: Run a 15-minute mock, get a Pass/Borderline/Fail, see the radar update.

## Sprint 6 — Training Plan
**Tasks**: T033–T035
**Goal**: After a few sessions, get a concrete "what to study next" plan.
**Demo**: After 3+ sessions, `/plan` shows real focus areas and daily tasks, not generic advice.

## Sprint 7 — Polish & Resilience
**Tasks**: T036–T041, T042–T043
**Goal**: The app survives AI hiccups, works well on a phone, and the question bank is browsable/extensible.
**Demo**: Kill your API key mid-session, confirm the retry/fallback flow doesn't lose the typed answer. Use the whole app on a phone for one real session.

## Sprint 8 — Production hardening (overlaps with [13-deployment-plan.md](13-deployment-plan.md))
**Tasks**: deployment setup, env var audit, smoke test on the live Vercel URL.
**Goal**: It's live, it's yours, you can use it from your phone anywhere.

## What's intentionally not sprinted

No QA/testing sprint, no "tech debt" sprint, no design-system sprint. For a single-user personal tool, manual verification at the end of each sprint (per the Demo line) substitutes for a formal test suite — automated tests are worth adding only where a regression would be expensive to notice late (the scoring math in `lib/scoring/`, and the AI schema validation paths are the two places worth a few unit tests; everything else is cheap to eyeball).
