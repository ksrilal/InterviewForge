# Production Deployment Plan

## Topology

```
Browser (you, any device)
   │ HTTPS
   ▼
Vercel (Next.js App Router — Server Components + Server Actions)
   │ service_role key, server-side only
   ▼
Supabase (Postgres + RLS, service_role-only policies)
   │
   ▼
Anthropic API / OpenAI API (selected via ACTIVE_AI_PROVIDER)
```

No separate backend, no containers, no queues. This is intentional given the brief's "no custom backend for MVP" constraint and the single-user scale.

## Supabase setup

1. Create a Supabase project (free tier is more than sufficient for one user's interview history).
2. Apply `supabase/migrations/0001_init.sql`.
3. Run the seed script to load `supabase/seed/questions.seed.json` into `questions`.
4. Copy the **service_role key** (not the anon key) into Vercel env vars — the anon key is never used since there's no client-side Supabase access.
5. Confirm RLS is enabled on all tables with the service_role-only policies from [02-database-schema.md](02-database-schema.md) — this is the only thing standing between "fine" and "anyone with the anon key reads your data" if the anon key ever leaked client-side, so it's worth double-checking in the Supabase dashboard post-deploy.

## Vercel setup

1. Import the GitHub repo into Vercel, framework preset auto-detects Next.js.
2. Set environment variables (Production + Preview, distinct values where it matters):

```
AUTH_USERNAME=...
AUTH_PASSWORD_HASH=...        # bcrypt hash, never store plaintext
SESSION_SECRET=...            # random 32+ byte secret for HMAC signing

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

ACTIVE_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1
```

3. Deploy. Vercel's default Next.js build (`next build`) requires no custom build command.
4. Confirm Server Actions work in production (they're same-origin POSTs under the hood — no CORS config needed since there's no separate API host).

## Domains

Default `*.vercel.app` URL is fine for personal use. A custom domain is a one-click Vercel addition later if desired — not a launch blocker.

## Secrets handling

- `AUTH_PASSWORD_HASH` is a bcrypt hash generated once locally (`bcrypt.hashSync(password, 12)`), never the raw password, even in env vars — if Vercel's env var storage were ever exposed, the password itself stays protected.
- `SESSION_SECRET` generated via `openssl rand -base64 32`, set once, never committed.
- `.env.local` is git-ignored; `.env.local.example` documents required keys with placeholder values only.

## Smoke test checklist (post-deploy)

- [ ] `/login` rejects wrong credentials, accepts correct ones, sets cookie.
- [ ] Visiting `(app)` routes while logged out redirects to `/login` (middleware works in production, not just dev).
- [ ] Start a practice session, submit an answer, confirm AI evaluation returns (validates both that Vercel can reach the AI provider and that env vars are correctly set).
- [ ] Confirm a row appears in Supabase `answers` table with scores populated.
- [ ] Test on an actual phone browser, not just desktop devtools responsive mode.

## Monitoring (right-sized for one user)

- Vercel's built-in function logs/analytics are sufficient — no need for a dedicated observability stack (Module 12 "Observability" in the knowledge brief is content the *app teaches*, not infrastructure the *app needs* at this scale).
- Optional: a simple `console.error` in the AI provider catch blocks is enough to debug evaluation failures via Vercel logs; do not add a logging service (Sentry, Datadog) until/unless this becomes more than a personal tool.

## Rollback

Vercel keeps every deployment; rolling back is "promote a previous deployment" in the dashboard — no extra rollback tooling needed. Supabase migrations are forward-only for MVP (no down-migrations authored) since schema changes are infrequent and reviewed by hand before applying to the single production DB.
