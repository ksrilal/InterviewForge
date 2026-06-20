import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser-side client for Supabase Auth only (signInWithOAuth/signOut).
// All data reads/writes still happen server-side via Server Actions using
// the cookie-bound client in ./server.ts - this client is never used to
// query app tables directly.
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
