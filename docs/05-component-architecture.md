# Component Architecture

## ShadCN primitives used

Generated into `components/ui/` via the ShadCN CLI, used as-is unless noted: `button`, `card`, `input`, `textarea`, `select`, `tabs`, `dialog`, `badge`, `progress`, `skeleton`, `separator`, `toast` (sonner), `radio-group`, `slider` (for difficulty filter), `accordion` (question bank common-mistakes/rubric disclosure).

No custom design system on top of ShadCN — themed via CSS variables only (see [04-frontend-architecture.md](04-frontend-architecture.md) theming section).

## Composition tree — Interview Screen (the core surface)

```
InterviewSessionScreen (client)                 src/app/(app)/interview/[sessionId]/page.tsx
├── SessionTimer (client)                       shows countdown for mock_15/30/60, hidden for practice
├── ThreadProgress (server-rendered props)       "Question 3 of 8 · Follow-up 2"
├── QuestionCard (server-rendered props)
│   └── Badge (category, difficulty, type)
├── AnswerInput (client)
│   ├── Textarea (ShadCN, autosize)
│   └── SubmitButton (disabled while pending, shows spinner via useTransition)
├── EvaluationPanel (client, conditionally rendered after submit)
│   ├── ScoreBreakdown (6 dimension bars using Progress)
│   ├── StrengthsList / WeaknessesList / MissingConceptsList (Accordion)
│   ├── SuggestedAnswer (Accordion, collapsed by default — don't spoil before user reads feedback)
│   └── InterviewerFeedback (styled as a quote/callout)
└── SessionControls (client)
    ├── ContinueButton (advance to follow-up or next topic)
    └── EndSessionButton (confirm dialog → routes to summary)
```

State ownership: `InterviewSessionScreen` holds the "what's currently displayed" state (current question, current evaluation, pending status) via the Zustand `interview-session.store.ts`, not prop-drilled through five levels — children read/write the store directly via hooks. This is the one screen complex enough to justify it (see [07-state-management.md](07-state-management.md)).

## Composition tree — Dashboard

```
DashboardPage (server)
├── ReadinessScoreCard (server-rendered, pure display)
│   └── (uses lib/scoring/readiness.ts, computed server-side, not a client component)
├── SkillRadarChart (client — Recharts requires it)            reused from radar/
├── RecentSessionsList (server-rendered)
│   └── SessionListItem × N (links to /sessions or /interview/[id]/summary)
└── StartInterviewCta (server-rendered link button to /interview/new)
```

## Composition tree — Skill Radar page

```
RadarPage (server)
├── SkillRadarChart (client)        Recharts <RadarChart> — current snapshot, 9 axes
├── SkillTrendChart (client)        Recharts <LineChart> — per-axis trend, axis selectable via Tabs
└── SkillBreakdownTable (server-rendered)   raw numbers for users who want exact values, not just visual
```

## Composition tree — New Interview flow

```
NewInterviewPage (server shell)
└── InterviewSetupForm (client — React Hook Form + Zod)
    ├── LevelSelect (RadioGroup: Junior/Mid/Senior/Staff/Tech Lead)
    ├── TypeSelect (RadioGroup: Backend/.NET/Architecture/.../Behavioral)
    ├── ModeSelect (Tabs: Practice / Mock 15 / Mock 30 / Mock 60)
    └── SubmitButton → calls `startSession` Server Action → redirects to /interview/[sessionId]
```

## Composition tree — Training Plan page

```
PlanPage (server)
├── ActivePlanCard
│   ├── FocusSkillsList (Badge per weak skill)
│   ├── DailyTaskChecklist (client — checkbox state is local/ephemeral, not persisted; it's a UX nicety not a tracked metric)
│   └── ReadinessProjection (text + small inline progress bar)
└── RegeneratePlanButton (client → calls `regeneratePlan` Server Action)
```

## Shared/cross-cutting components

- `layout/nav-bar.tsx` + `layout/mobile-bottom-nav.tsx`: both derive active-route highlighting from `usePathname()`, share a single `NAV_ITEMS` const (icon, label, href) defined once in `lib/utils.ts` or a small `lib/nav-items.ts` — not duplicated between the two nav components.
- `QuestionCard` is reused in both the interview screen and the question bank detail page — same component, different action slot (interview screen shows the answer input below it; bank page shows rubric/history instead). Achieved via a `children` slot, not a boolean prop fork.

## Component design rules applied

- No component takes more than ~5-6 props before it's split or given a config object — most domain data passed as a single typed object (e.g. `question: Question`, `evaluation: Evaluation`) rather than spread fields.
- Client components are leaves wherever possible; Server Components own the tree's root and data-fetching boundary per route, per [04-frontend-architecture.md](04-frontend-architecture.md).
- Charts (`SkillRadarChart`, `SkillTrendChart`) accept pre-shaped data arrays, not raw DB rows — the shaping happens in the Server Component or a `lib/scoring/` helper, keeping chart components pure/presentational and reusable if the data source ever changes.
