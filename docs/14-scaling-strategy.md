# Future Scaling Strategy

This is a single-user personal tool. "Scaling" here means two different things, addressed separately: **scaling the product surface** (more features/depth) and **scaling beyond one user** (if you ever wanted to share it). Don't build for the second one preemptively — this section exists so that *if* it's ever needed, the path is clear, not so it gets built now.

## What actually breaks first, realistically

1. **AI cost**, not infrastructure. The follow-up cap and session caps in [06-ai-prompt-architecture.md](06-ai-prompt-architecture.md) are the real scaling lever for a single user — Vercel/Supabase free tiers comfortably handle one person's traffic indefinitely.
2. **Question bank staleness**. A static 150-250 seed set will feel repetitive after weeks of daily practice. The AI-generation path (Module 2's `source = 'ai_generated'`) is the mitigation already designed in — worth prioritizing actual usage of it over expanding the manual seed set further.
3. **Skill snapshot accuracy at low sample counts.** Early on, a single bad/lucky answer swings an axis average a lot (e.g., 1 sample). This is already surfaced honestly via `sample_count` shown next to averages (see [09-wireframes.md](09-wireframes.md) radar table) rather than hidden — the fix is transparency, not infrastructure.

## If you ever want multi-user (friends, a small cohort, productized)

Migration path, in order:
1. Add `user_id uuid not null default '<your-existing-user-id>'` to every table currently unscoped (questions can stay global/shared; sessions/answers/skill_*/training_plans become per-user).
2. Replace the env-var single-user check with real Supabase Auth (email/password or magic link) — this is a drop-in replacement since Supabase Auth issues a JWT that RLS can check via `auth.uid()`, and the app already talks to Supabase server-side.
3. Flip RLS policies from "service_role only" to "service_role OR `auth.uid() = user_id`" per table.
4. Question bank stays shared/global (no `user_id`) since there's no reason to silo generic interview questions per user — only personal history needs isolation.
5. AI cost now needs per-user budgting/rate-limiting — add a simple monthly call counter per user before this becomes a real concern.

This is a deliberately deferred decision, not a half-built feature — none of this is started in MVP, because building multi-tenancy for a confirmed single user is exactly the premature engineering the brief warns against.

## If interview depth/realism needs to go further

- **Voice mode**: would need a streaming STT/TTS layer (e.g., browser `MediaRecorder` + a transcription API) — additive, doesn't change the core session/evaluation data model since "answer_text" just becomes "transcribed answer_text."
- **Live coding/debugging questions with real execution**: would need a sandboxed code runner (e.g., a WASM-based runner or a serverless function with strict timeouts) — this is the one area that would start to strain "frontend-only," but can be scoped as an isolated Edge Function without touching the rest of the architecture.
- **Richer system design evaluation** (e.g., actual diagram input, not just text): would need a diagramming component (e.g., excalidraw-style canvas) whose output gets serialized into the evaluation prompt as a structured description — additive to Module 3, not a redesign.

## What NOT to do even at larger scale

- Don't introduce microservices or a separate API server — Next.js Server Actions scale fine on Vercel for this workload shape (low request volume, AI-call-bound latency, not compute-bound).
- Don't add a message queue/event bus for "AI evaluation jobs" — synchronous Server Action calls are simpler and the latency (a few seconds per AI call) is already acceptable UX for an interview-pacing app; only revisit if evaluation latency becomes the actual bottleneck. (Note: the brief's "Event Driven Systems" knowledge area is content the app *teaches*, not a pattern the app itself needs internally.)
- Don't build a custom analytics/observability stack — Vercel + Supabase dashboards remain sufficient until there are real concurrent users with real uptime requirements, which is out of scope for this product as defined.
