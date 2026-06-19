# Product Requirements Document — InterviewForge

## 1. Purpose

A web application that answers: **"Am I ready to pass a Senior Software Engineer interview today?"** Originally built single-user, now multi-tenant (see §2) — the product scope and module list below are otherwise unchanged by that pivot.

It is a training tool, not a course platform. Every feature must either (a) simulate a real interview moment, (b) evaluate a real interview answer, or (c) tell the user what to fix before their next real interview. Anything else is out of scope.

## 2. User

**v2 update:** multi-tenant via Supabase Auth. Sign-in supports Google OAuth and email/password (with email confirmation, per Supabase project defaults) — both create the same `profiles` row via an `auth.users` insert trigger, and both are first-class, not a fallback. Each account gets fully isolated data via Postgres RLS (`auth.uid() = user_id`) — see `supabase/migrations/0004_multi_tenant_foundation.sql`. Anyone who signs up gets their own empty workspace; there is no invite/approval step (acceptable since there's no shared data between accounts to protect against).

## 3. Problem statement

Generic interview prep (LeetCode, course videos) trains isolated skills but never simulates the actual pressure of: an interviewer asking a vague question, the candidate answering, the interviewer probing deeper, and a real-time judgment of seniority. Candidates walk in to Staff/Senior loops underprepared for follow-up depth, system design tradeoff discussions, and behavioral STAR delivery — not because they lack knowledge, but because they've never rehearsed it under interrogation.

## 4. Goals (MVP)

1. Run a simulated interview session (text-based) across a chosen role level + interview type, with adaptive follow-ups.
2. Score every answer 0–100 against accuracy, depth, completeness, practicality, communication, seniority.
3. Persist results so skill growth is visible over time (Skill Radar).
4. Produce a personalized plan of what to study next based on weakest areas.
5. Run timed mock interviews (15/30/60 min) that produce a Pass / Borderline / Fail verdict.

## 5. Non-goals (explicitly excluded from MVP, see [10-mvp-roadmap.md](10-mvp-roadmap.md))

- Voice/video interviews (text-only for MVP).
- Teams, shared workspaces, leaderboards, or any cross-account visibility. (Multi-user *accounts* with isolated data are now in scope — see §2 — but accounts never see or affect each other.)
- Live coding/code execution sandbox (questions can *reference* code, but no code runner).
- Mobile native app — mobile-friendly responsive web only.
- Content marketplace, community-submitted questions.
- Real-time collaborative anything.
- Additional domains beyond Software Engineering (QA, HR, DevOps, Data Engineering) — `domains`/`domain_id` exist as a schema scaffold (`supabase/migrations/0004_multi_tenant_foundation.sql`) so this isn't a rewrite later, but no other domain has real question content yet.

## 6. Functional requirements by module

### Module 1 — Interview Simulator
- User selects level (Junior/Mid/Senior/Staff/Tech Lead) and type (Backend/.NET/Architecture/System Design/Cloud/DevOps/Behavioral/Full Stack).
- AI asks an opening question matched to level+type, drawn from the question bank or generated fresh.
- User submits a free-text answer.
- AI evaluates inline, decides whether to ask a follow-up (adaptive engine, Module 4) or move to a new topic.
- Session ends after a fixed number of question "threads" or when the user ends it.
- On end: full session summary + per-answer scores + overall session score.

### Module 2 — Question Bank
- Each question has: category, topic, difficulty, interview level, expected answer areas, follow-up questions, common mistakes, scoring rubric, type (theory/scenario/debugging/architecture/system-design/behavioral).
- Seeded with a curated static set (see [02-database-schema.md](02-database-schema.md) seed strategy) covering all 15 knowledge areas in the brief.
- AI can generate net-new questions on demand constrained to the same schema, which get persisted back into the bank (so the bank grows from usage).
- **v2:** questions carry `owner_user_id` (null = shared/global bank, visible to everyone; set = private to the generating account) and `domain_id` (currently always Software Engineering). AI-generated questions today still default to the shared global bank — private-question generation isn't wired into the UI yet, the column just exists so it can be without a migration later.

### Module 3 — AI Evaluation Engine
- Input: question + rubric + user's answer + conversation history (for follow-up context).
- Output (strict JSON): overall score (0–100), per-dimension scores (accuracy, depth, completeness, practicality, communication, seniority), strengths[], weaknesses[], missing_concepts[], suggested_answer, interviewer_feedback.
- Every evaluation is persisted to `answers` table tied to the session.

### Module 4 — Adaptive Follow-Up Engine
- After each evaluation, the AI decides: ask a deeper follow-up on the same topic, pivot to a related topic, or close the thread.
- Decision factors: score (low score → probe the same gap; high score → go deeper or move on), how many follow-ups already asked on this thread (cap at 3 to avoid infinite drilling), time/question budget remaining in the session.
- Difficulty escalates within a thread: definition → reasoning ("why") → applied ("how do you implement this in ASP.NET Core") → edge case ("when would you avoid this").

### Module 5 — Skill Radar
- Skill dimensions tracked: Architecture, System Design, Databases, Security, Backend, Cloud, DevOps, Leadership, Communication (9 axes — matches brief).
- Every scored answer contributes to a rolling per-skill average (recency-weighted: last 20 answers per skill, exponential decay).
- Radar chart (Recharts) + trend line per skill over time + a single "Readiness Score" (weighted composite, weights configurable per target level since Staff interviews weight Architecture/Leadership higher than Mid-level).

### Module 6 — Mock Interviews
- Fixed-duration timed mode: 15/30/60 min, mixed question types pulled proportionally (technical/architecture/system-design/behavioral) based on a per-duration template.
- Countdown timer visible; session auto-submits/ends at time limit.
- Final verdict: Pass / Borderline / Fail, derived from overall score thresholds + whether any "hard fail" dimension (e.g., security fundamentals at Senior level) was critically wrong.

### Module 7 — Personalized Training Plan
- After enough session history exists (configurable minimum, e.g. 3 sessions), generate a plan: weakest 2–3 skills, daily micro-tasks (e.g. "answer 3 questions on Caching"), a weekly target, and a readiness-by-date estimate if the user has a target interview date.
- Plan regenerates on demand, not continuously — avoids the AI flip-flopping daily.

## 7. Cross-cutting requirements

- **Mobile-friendly**: every screen usable on a phone — interview Q&A screen is the most-used surface and must work one-handed.
- **Resilience to AI failures**: if the active provider errors or returns malformed JSON, retry once with the other configured provider if available, otherwise show a clear "evaluation failed, your answer was saved, retry evaluation" state. Never lose the user's typed answer.
- **No data loss**: every user answer is saved to DB before the AI call is made (optimistic write), so a crashed AI call never loses input.
- **Cost awareness**: this is a personal project — avoid unbounded AI spend. Follow-up cap (3 per thread), session question cap, and a visible token/cost estimate are part of MVP, not a later add-on.

## 8. Success metrics (per account, not business)

"Success" is self-assessed per account, same as the original single-user design — multi-tenancy isolates accounts, it doesn't introduce cross-account metrics, growth loops, or admin dashboards:
- Skill Radar shows upward trend over weeks.
- Mock interview verdict moves from Borderline → Pass for target level.
- Time-to-answer and follow-up depth handled improves (fewer "I don't know" / low-depth scores on repeat topics).

## 9. Key risks

| Risk | Mitigation |
|---|---|
| AI evaluation is inconsistent/lenient | Rubric is embedded in every prompt verbatim per question, not paraphrased; scoring anchored with explicit 0-100 band descriptions in the prompt (see [06-ai-prompt-architecture.md](06-ai-prompt-architecture.md)) |
| RLS misconfiguration leaks data across accounts | Every account-owned table (`sessions`, `training_plans`, `skill_snapshots`, `skill_score_events`, and the join-based policies on `session_questions`/`answers`) is scoped by `auth.uid() = user_id` in `0004_multi_tenant_foundation.sql`, verified end-to-end with a headless-browser pass (redirect-when-logged-out, sign-up/sign-in error paths) before being treated as done |
| AI cost runs away | Follow-up caps, session caps, model selection via env (can default to cheaper models), no background/idle AI calls |
| Scope creep into "learning platform" | Every new feature request gets checked against the Module list above; if it doesn't fit, it's out |
