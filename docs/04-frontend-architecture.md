# Frontend Architecture

## Rendering strategy

| Route | Strategy | Why |
|---|---|---|
| `/login` | Static + client form | No data dependency |
| `/dashboard` | Server Component, dynamic (`force-dynamic` or fetch with no cache) | Reads latest skill snapshot + recent sessions every visit; data changes after every session |
| `/interview/new` | Server Component for static option lists, client island for the picker | Level/type lists are static enums |
| `/interview/[sessionId]` | Client Component shell + Server Actions | Highly interactive — needs immediate UI feedback on submit, timer ticking, follow-up arriving. Server Actions handle the actual mutation/AI call |
| `/interview/[sessionId]/summary` | Server Component | Pure read of completed session, no interactivity needed beyond charts |
| `/questions` | Server Component with client-side filter controls | Bank is large-ish but static per request; filtering can be client-side over a fetched page or server-side via search params |
| `/radar` | Server Component renders data, Recharts components are client islands | Charts need client-side rendering (canvas/SVG interactivity) |
| `/plan` | Server Component | Read + a single "regenerate" Server Action button |

Default to **Server Components**. A component only becomes a Client Component when it needs: browser state (timer, form input, draft answer), interactivity (chart hover, tabs), or a Zustand hook.

## Routing

Next.js App Router with two route groups:
- `(auth)` — unauthenticated, just `/login`.
- `(app)` — everything else, wrapped by `middleware.ts` which checks the session cookie and redirects to `/login` if absent/invalid.

No nested parallel routes or intercepting routes needed — this app's navigation is straightforwardly hierarchical. Avoid route complexity that doesn't pay for itself.

## Data fetching pattern

- Server Components fetch directly via the Supabase server client (`lib/supabase/server.ts`) — no client-side `fetch` to internal APIs, no React Query/SWR needed since there's no client-side cache invalidation problem to solve (single user, no concurrent writers, no real-time sync requirement).
- Mutations go through Server Actions, called directly from forms (`<form action={submitAnswer}>`) or via `useTransition` + direct call from client components for the interactive interview screen (so we can show a pending/optimistic state while the AI evaluates).
- After a mutation that should reflect elsewhere (e.g., finishing a session should update the dashboard's readiness score), use `revalidatePath` inside the Server Action rather than client-side cache invalidation.

## The interview screen — the one genuinely complex client surface

`/interview/[sessionId]/page.tsx` is a Client Component because it needs:
1. Immediate display of the current question (from initial server-rendered props, then client-managed as the thread advances).
2. A textarea with draft state, optionally autosaved to Zustand so a refresh doesn't lose in-progress typing.
3. A pending/streaming state while evaluation runs (`useTransition` wrapping the `submitAnswer` Server Action call).
4. Conditional rendering of: evaluation panel → follow-up question OR "thread complete, next topic" OR "session complete."
5. A visible countdown timer for mock modes, ticking client-side, independent of server round-trips.

This screen is the only place Zustand's `interview-session.store.ts` is used substantively (see [07-state-management.md](07-state-management.md)).

## Mobile-first responsive approach

- Tailwind breakpoints used mobile-up (`sm:`, `md:`, `lg:` additive, base styles target phone).
- Primary navigation is a bottom tab bar on mobile (`mobile-bottom-nav.tsx`, fixed position, shown `< md`), a top nav bar on desktop (`nav-bar.tsx`, shown `>= md`). Both read the same active-route logic; no duplicated state.
- The interview Q&A screen is designed phone-first: question text, then answer textarea, then submit — single column, large tap targets, sticky submit button above the mobile keyboard.
- Charts (Recharts) given explicit `ResponsiveContainer` wrappers and simplified tick/legend rendering below `sm` breakpoint (fewer axis labels, smaller radar grid) to stay legible on small screens.

## Error & loading states

- `loading.tsx` per route segment using ShadCN `Skeleton` components matching the eventual layout (no generic spinners).
- `error.tsx` per route segment for Server Component fetch failures.
- AI evaluation failure is *not* a route-level error — it's a local state in the interview screen (per PRD §7: answer is already saved, show inline retry).

## Theming

ShadCN's CSS-variable theme system, single dark theme only — no light/dark toggle in MVP, that's a nice-to-have, not a readiness-moving feature. Dark is the right default here (not just an aesthetic choice): this app is used for focused reading/typing sessions, often in the evening before/after work, and a near-black background with a single confident accent color reads as "serious training tool," not "course platform."

### Palette

Near-black/charcoal base (not pure `#000`, which is harsh for long text reading) with a violet-blue accent — distinct from the generic "indigo SaaS" look without being loud:

```css
:root {
  /* base surfaces */
  --background: 222 25% 6%;        /* #0a0d14 — near-black, slight blue cast */
  --foreground: 210 20% 92%;       /* #e6e9ed — soft white, not pure white (less eye strain) */
  --card: 222 22% 9%;              /* #11141c — slightly lifted off background */
  --card-foreground: 210 20% 92%;
  --popover: 222 22% 9%;
  --popover-foreground: 210 20% 92%;
  --border: 222 15% 18%;           /* subtle, visible only on close inspection */
  --input: 222 15% 16%;
  --ring: 258 90% 66%;             /* focus ring matches accent */

  /* accent — violet, used for primary actions, active nav, score highlights */
  --primary: 258 90% 66%;          /* #8b5cf6-ish vivid violet */
  --primary-foreground: 0 0% 100%;
  --secondary: 222 18% 14%;
  --secondary-foreground: 210 20% 92%;
  --muted: 222 18% 13%;
  --muted-foreground: 215 12% 60%;
  --accent: 258 60% 20%;           /* muted violet for subtle hover states */
  --accent-foreground: 210 20% 92%;

  /* semantic — score bands and verdicts (Pass/Borderline/Fail, dimension bars) */
  --success: 142 70% 45%;          /* green — Pass, high scores (70+) */
  --warning: 38 92% 55%;           /* amber — Borderline, mid scores (40-69) */
  --destructive: 0 72% 58%;        /* red — Fail, low scores (<40) */
  --destructive-foreground: 0 0% 100%;

  --radius: 0.625rem;              /* slightly rounded, not pill-shaped — feels precise, not playful */
}
```

### Application-specific theming rules

- **Score bars/badges always use the semantic success/warning/destructive tokens above, never the primary accent** — so "this is a score" is visually distinct from "this is a clickable action." The radial progress bars in `EvaluationPanel` (see [05-component-architecture.md](05-component-architecture.md)) shift color across the 0-100 range using these three anchors with a smooth interpolation, not a hard cutoff.
- **Primary violet is reserved for actions and active state** — submit buttons, the active bottom-nav tab, the current radar axis selection. If everything is violet, nothing reads as "press this."
- **Cards (`--card`) are only ever one step lighter than background** — avoids the "floating gray boxes everywhere" look common in default ShadCN dark themes. Depth comes from a 1px `--border`, not heavy shadows (shadows read oddly on near-black backgrounds anyway).
- **Charts (Recharts)**: radar grid lines use `--border`, the filled skill-radar polygon uses `--primary` at ~30% fill opacity with a solid stroke, trend lines use `--primary` solid. Never introduce a second hue into charts beyond the semantic score colors — keeps the radar/trend views visually calm against a busy 9-axis dataset.
- **Typography**: a single sans-serif (system font stack or Inter) for UI, but the interview question text itself (`QuestionCard` prompt) renders slightly larger (`text-lg`/`text-xl`) with increased line-height — it's the thing being read most carefully in the whole app and deserves the most legible treatment.
- Implemented via `app/globals.css` `:root` block above feeding ShadCN's existing CSS-variable consumption (`tailwind.config.ts` already maps these names by convention) — no extra theming library, no per-component inline color overrides.
