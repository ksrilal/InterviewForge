import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// User-scoped client, bound to the current request's auth cookies. Every
// Server Action/Server Component uses this - it carries the logged-in
// user's JWT, so Postgres RLS policies (auth.uid() = user_id) do the actual
// per-user data isolation. There is no service-role client in the app
// runtime anymore; the only service-role usage left is the standalone seed
// script (supabase/seed/load-seed.ts), which creates its own client.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render - middleware already
            // refreshes the session cookie on the request/response, so
            // this write can be safely ignored here.
          }
        },
      },
    }
  );
}
