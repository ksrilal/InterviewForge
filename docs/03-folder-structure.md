# Folder Structure

```
interviewforge/
├── docs/                              # this documentation set
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql              # the DDL from 02-database-schema.md
│   └── seed/
│       └── questions.seed.json        # ~150-250 curated questions
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx           # single-user login form
│   │   ├── (app)/                     # everything behind middleware auth check
│   │   │   ├── layout.tsx             # app shell: nav, mobile bottom bar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # readiness score, recent sessions, CTA
│   │   │   ├── interview/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx       # level + type + mode picker (Module 1 & 6 entry)
│   │   │   │   └── [sessionId]/
│   │   │   │       ├── page.tsx       # live Q&A screen
│   │   │   │       └── summary/
│   │   │   │           └── page.tsx   # post-session results
│   │   │   ├── questions/
│   │   │   │   ├── page.tsx           # question bank browser
│   │   │   │   └── [questionId]/
│   │   │   │       └── page.tsx       # single question detail (rubric, history of attempts)
│   │   │   ├── radar/
│   │   │   │   └── page.tsx           # Module 5 — skill radar + trends
│   │   │   ├── sessions/
│   │   │   │   └── page.tsx           # history list of all past sessions
│   │   │   ├── plan/
│   │   │   │   └── page.tsx           # Module 7 — training plan
│   │   │   └── settings/
│   │   │       └── page.tsx           # AI provider/model display (read from env, no edit UI for MVP)
│   │   ├── api/
│   │   │   └── (reserved)             # only used if a true streaming endpoint is needed; prefer Server Actions
│   │   ├── globals.css
│   │   └── layout.tsx                 # root layout (fonts, theme provider)
│   │
│   ├── actions/                       # Server Actions — the only "backend"
│   │   ├── auth.actions.ts            # login/logout
│   │   ├── session.actions.ts         # start/end session, advance thread
│   │   ├── answer.actions.ts          # submit answer, trigger evaluation
│   │   ├── question.actions.ts        # fetch/filter/generate questions
│   │   ├── radar.actions.ts           # compute/fetch skill snapshots
│   │   └── plan.actions.ts            # generate/fetch training plan
│   │
│   ├── ai/
│   │   ├── provider.ts                # AIProvider interface + factory (reads ACTIVE_AI_PROVIDER)
│   │   ├── providers/
│   │   │   ├── anthropic.provider.ts
│   │   │   └── openai.provider.ts
│   │   ├── prompts/
│   │   │   ├── interviewer.prompt.ts       # opening question framing
│   │   │   ├── evaluation.prompt.ts        # Module 3 rubric-grounded eval
│   │   │   ├── followup.prompt.ts          # Module 4 adaptive decision
│   │   │   ├── question-generation.prompt.ts
│   │   │   └── training-plan.prompt.ts
│   │   └── schemas/
│   │       └── ai-response.schemas.ts # Zod schemas the AI JSON output is validated against
│   │
│   ├── components/
│   │   ├── ui/                        # ShadCN generated primitives (button, card, dialog, etc.)
│   │   ├── interview/
│   │   │   ├── question-card.tsx
│   │   │   ├── answer-input.tsx
│   │   │   ├── evaluation-panel.tsx
│   │   │   ├── session-timer.tsx
│   │   │   └── thread-progress.tsx
│   │   ├── radar/
│   │   │   ├── skill-radar-chart.tsx
│   │   │   └── skill-trend-chart.tsx
│   │   ├── dashboard/
│   │   │   ├── readiness-score-card.tsx
│   │   │   └── recent-sessions-list.tsx
│   │   ├── plan/
│   │   │   └── training-plan-card.tsx
│   │   └── layout/
│   │       ├── nav-bar.tsx
│   │       └── mobile-bottom-nav.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts              # server-side client using service role key
│   │   │   └── types.ts               # generated DB types (supabase gen types)
│   │   ├── scoring/
│   │   │   ├── readiness.ts           # composite readiness score calc
│   │   │   └── skill-weighting.ts     # recency-weighted rolling average
│   │   ├── auth/
│   │   │   ├── session.ts             # sign/verify session cookie
│   │   │   └── guard.ts               # helper used in middleware + actions
│   │   └── utils.ts                   # cn() etc. (ShadCN standard)
│   │
│   ├── store/
│   │   ├── interview-session.store.ts # Zustand: in-progress session client state
│   │   └── ui.store.ts                # Zustand: ephemeral UI state (modals, toasts)
│   │
│   ├── types/
│   │   └── domain.ts                  # shared domain types (Question, Session, Evaluation, etc.)
│   │
│   └── middleware.ts                  # auth guard for (app) route group
│
├── public/
├── .env.local.example
├── components.json                    # ShadCN config
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Rationale for key choices

- **`(auth)` and `(app)` route groups**: clean separation so `middleware.ts` can guard one path prefix pattern without touching the login page itself.
- **`actions/` instead of `app/api/`**: Server Actions are colocated, type-safe end-to-end with the client, and avoid hand-rolled fetch/JSON for what is fundamentally RPC. `app/api/` is kept reserved only for the rare case of needing a streaming text response that Server Actions handle awkwardly (e.g. token-by-token interview question streaming) — not used at MVP launch.
- **`ai/` is provider-agnostic at the call site**: every Server Action calls `getAIProvider().generateEvaluation(...)` etc.; nothing outside `ai/providers/` knows whether Anthropic or OpenAI is active. This is the thin-interface pattern from [06-ai-prompt-architecture.md](06-ai-prompt-architecture.md).
- **`store/` is intentionally small**: Zustand only holds client-side ephemeral state for the *active* interview session (current question, draft answer text, timer) — not data that's already durable in Postgres. See [07-state-management.md](07-state-management.md) for the full server-vs-client state split.
- **No `services/` or `repositories/` layer**: with Supabase + Server Actions, the action *is* the service layer. Adding a repository abstraction over a single Postgres client used by one app is the premature abstraction the brief explicitly warns against.
