import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: ReturnType<typeof createClient<Database>> | null = null;

// Service-role client only. There is no anon/public Supabase usage anywhere
// in this app — every read and write happens server-side (Server Components
// or Server Actions), so this is the only client InterviewForge ever creates.
export function getSupabaseServerClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return client;
}
