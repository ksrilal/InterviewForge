# Supabase setup

1. Create a Supabase project at supabase.com.
2. In the SQL editor (or via `supabase db push` with the CLI), run every file in `migrations/` in order, `0001` through the highest-numbered file present (currently `0010_freeform_skill_axes.sql`). Each one is additive/re-runnable, so if you're not sure which have already been applied, it's safe to just re-run all of them in sequence.
3. Enable Google sign-in: Supabase dashboard → Authentication → Providers → Google. Create an OAuth client in the Google Cloud Console (Web application type) with an authorized redirect URI of `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste its Client ID/Secret into the Supabase Google provider settings.
4. Add your local and deployed app URLs to Authentication → URL Configuration → Redirect URLs (e.g. `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`).
5. Set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) - used by the app's user-facing client/server Supabase clients.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (same URL, service_role key) - used only by the standalone seed script below, never by the app at runtime.
6. Load the seed question bank:
   ```
   npm run seed
   ```
7. Confirm in the Supabase dashboard that RLS is enabled on every table, and that the per-user (`owner_all_*`) policies from `0004_multi_tenant_foundation.sql` are active (Table Editor → table → RLS).

See [docs/02-database-schema.md](../docs/02-database-schema.md) and [docs/13-deployment-plan.md](../docs/13-deployment-plan.md) for the full rationale (note: those docs describe the original single-user design - `0004_multi_tenant_foundation.sql` is the source of truth for the current schema).
