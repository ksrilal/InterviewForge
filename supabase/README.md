# Supabase setup

1. Create a Supabase project at supabase.com.
2. In the SQL editor (or via `supabase db push` with the CLI), run `migrations/0001_init.sql`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role key) in `.env.local`.
4. Load the seed question bank:
   ```
   npm run seed
   ```
5. Confirm in the Supabase dashboard that RLS is enabled on every table with the `service_role_all` policy (Table Editor → table → RLS).

See [docs/02-database-schema.md](../docs/02-database-schema.md) and [docs/13-deployment-plan.md](../docs/13-deployment-plan.md) for the full rationale.
