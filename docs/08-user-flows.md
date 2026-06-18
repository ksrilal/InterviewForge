# User Flows

## Flow 1 — Login (single user)

```
/login
  → user enters username + password
  → LoginForm validates non-empty (Zod) client-side
  → login Server Action checks against AUTH_USERNAME / AUTH_PASSWORD_HASH env vars
  → on match: sign a session token (HMAC, see lib/auth/session.ts), set httpOnly cookie
  → redirect to /dashboard
  → on mismatch: inline error, no hint which field was wrong
```

## Flow 2 — Practice interview (Module 1 + 4)

```
/dashboard → "Start Interview" CTA
  → /interview/new
  → select Level, Type, Mode = Practice
  → submit → startSession Server Action:
       - creates `sessions` row (status=in_progress, mode=practice)
       - picks/generates root question matching level+type → creates `session_questions` row (depth 0)
  → redirect to /interview/{sessionId}
  → QuestionCard renders root question
  → user types answer → submit
       - answer saved to `answers` table FIRST (no eval yet)
       - evaluateAnswer Server Action calls AI → validates → updates `answers` row with scores
       - skill_score_events rows inserted (one per skill_axis the question touches)
  → EvaluationPanel shows scores/feedback
  → decideFollowUp Server Action runs:
       - ASK_FOLLOW_UP → new `session_questions` row (depth+1, parent set) → loop back to answer step
       - NEW_TOPIC → new root question selected → loop back to answer step (depth resets to 0)
       - END_SESSION → proceed to end-of-session
  → user can also manually tap "End Session" at any time
  → endSession Server Action:
       - sets sessions.status=completed, ended_at, overall_score (avg of all answers), summary (AI-written narrative)
       - writes skill_snapshots rollup
  → redirect to /interview/{sessionId}/summary
```

## Flow 3 — Timed mock interview (Module 6)

Same as Flow 2, with differences:
```
  → Mode = mock_15 / mock_30 / mock_60 selected on /interview/new
  → startSession sets time_limit_seconds; SessionTimer starts counting down client-side from page load
  → question mix is pulled proportionally from the mode's template (technical/architecture/system-design/behavioral ratios) rather than a single interview_type filter
  → timer hitting 0 triggers an automatic endSession call (same as manual end, just system-initiated)
  → summary page additionally shows the Pass/Borderline/Fail verdict, computed from:
       - overall_score thresholds (e.g. >=75 pass, 55-74 borderline, <55 fail)
       - AND a hard-fail override if any in-scope critical dimension (e.g. Security at Senior+) scored <30 on any single answer
```

## Flow 4 — Reviewing a past session

```
/sessions → list of all sessions (date, level, type, mode, score, verdict if applicable)
  → tap a session → /interview/{sessionId}/summary
  → shows full thread (root questions + follow-ups + answers + scores), session-level strengths/weaknesses, suggested answers
```

## Flow 5 — Browsing the question bank

```
/questions → filter controls (level, type, category, difficulty)
  → list of QuestionCard previews
  → tap one → /questions/{questionId}
  → shows full rubric, common mistakes, follow-up seeds, and (if the user has answered this exact question before) their past attempt(s) and scores
  → optional: "Practice this question now" → starts a 1-question practice session pre-seeded with this question id
```

## Flow 6 — Skill Radar review (Module 5)

```
/radar
  → SkillRadarChart shows current 9-axis snapshot
  → tap/select an axis → SkillTrendChart shows that axis's rolling average over time (from skill_snapshots history)
  → ReadinessScoreCard-equivalent breakdown table shows raw numbers + sample counts (so a 92 average from 2 answers reads differently than from 20)
```

## Flow 7 — Training plan generation (Module 7)

```
/plan
  → if no active plan, or user taps "Regenerate":
       generatePlan Server Action:
         - requires >= 3 completed sessions (else shows "complete a few more sessions first" empty state)
         - reads latest skill_snapshots + recent verdicts
         - optionally takes targetLevel/targetDate input (small form)
         - calls AI generateTrainingPlan → validates → writes `training_plans` row (is_active=true, deactivates prior)
  → ActivePlanCard renders focus skills, daily tasks, weekly goal, readiness projection
  → daily task checkboxes are local-only UX (not persisted — see 07-state-management.md), plan itself persists until regenerated
```

## Flow 8 — AI evaluation failure recovery (cross-cutting, ties to PRD §7)

```
user submits answer → answer row saved → AI call fails or returns invalid schema
  → Server Action returns { ok: false, error, answerId }
  → UI shows: "Your answer was saved. Evaluation failed — retry?" with a Retry button
  → Retry calls a dedicated retryEvaluation Server Action keyed by answerId (does not require re-typing the answer)
  → if retry also fails and a second provider is configured, automatically falls back to it before surfacing the error a second time
```
