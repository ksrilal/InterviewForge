import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Used inside Server Actions/Server Components to confirm the request is
// authenticated (defense-in-depth alongside middleware.ts) and to get back
// a client already bound to that user's session, so RLS scopes every query.
export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user: data.user };
}

// Used by admin-only pages/actions (the Users page and its mutations).
// Redirects rather than throwing because a logged-in candidate landing on an
// admin route is a normal navigation case, not an error condition.
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, user };
}
