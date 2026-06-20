import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role client for privileged operations that must bypass RLS/column
// grants entirely: admin updates to other users' profiles (role, AI access,
// disabled flag) and the Supabase Auth ban API. Every caller of this must
// have already verified the requester is an admin in app code (requireAdmin)
// - this client itself enforces nothing.
export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY must be set for admin operations.");
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
