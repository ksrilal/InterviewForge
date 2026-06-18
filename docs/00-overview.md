# InterviewForge — Documentation Index

InterviewForge is a personal-use (single-user) Software Engineering Interview Training Platform. It simulates real interviews, evaluates answers with AI, tracks skill growth over time, and generates a personalized prep plan.

## Locked-in decisions

| Area | Decision |
|---|---|
| AI providers | Both Anthropic and OpenAI supported behind one interface, switchable via `ACTIVE_AI_PROVIDER` env var |
| Data layer | Supabase Postgres (not local-only) — needed for history, skill radar trends, training plans |
| Auth | No external auth provider. Single hardcoded user via env vars + signed httpOnly session cookie + Next.js middleware |
| Architecture | Next.js App Router, Server Actions as the only "backend", Supabase for persistence, no separate API server |
| AI abstraction | Thin unified interface (`AIProvider`) with two implementations, selected by factory — not a heavy plugin registry |
| Delivery | Docs first (this set), then code scaffold in a follow-up pass |

## Document map

1. [01-prd.md](01-prd.md) — Product Requirements Document
2. [02-database-schema.md](02-database-schema.md) — Supabase/Postgres schema (DDL + rationale)
3. [03-folder-structure.md](03-folder-structure.md) — Complete Next.js project layout
4. [04-frontend-architecture.md](04-frontend-architecture.md) — Frontend architecture, routing, rendering strategy
5. [05-component-architecture.md](05-component-architecture.md) — Component tree, ShadCN usage, composition patterns
6. [06-ai-prompt-architecture.md](06-ai-prompt-architecture.md) — AIProvider interface, prompt templates per module, evaluation rubric encoding
7. [07-state-management.md](07-state-management.md) — Zustand store design, what lives in client state vs server/DB
8. [08-user-flows.md](08-user-flows.md) — End-to-end flows for each module
9. [09-wireframes.md](09-wireframes.md) — Low-fidelity ASCII wireframes for key screens, mobile-first
10. [10-mvp-roadmap.md](10-mvp-roadmap.md) — What's in MVP vs later phases, with rationale for cuts
11. [11-development-tasks.md](11-development-tasks.md) — Concrete task breakdown
12. [12-sprint-breakdown.md](12-sprint-breakdown.md) — Tasks grouped into sprints
13. [13-deployment-plan.md](13-deployment-plan.md) — Vercel + Supabase production setup
14. [14-scaling-strategy.md](14-scaling-strategy.md) — What breaks first if this grows beyond personal use, and how to fix it

## Design principles applied throughout

- **Single user, no multi-tenancy.** No `users` table beyond a single config row. No RLS complexity for multi-tenant isolation — RLS is still used, but scoped to "service role only" since there's one user and the app server is the only client.
- **No premature abstraction.** No plugin registry, no microservices, no event bus. One Next.js app, one Postgres DB, one AI interface with two backends.
- **Server Actions over API routes** wherever possible — fewer files, no manual fetch/JSON boilerplate, native to App Router.
- **Cut anything that doesn't serve "Am I ready for a Senior interview today?"** — e.g., no social features, no leaderboards, no content marketplace.
