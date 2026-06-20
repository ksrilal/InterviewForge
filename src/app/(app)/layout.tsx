import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NavBar } from "@/components/layout/nav-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already ran auth.getUser() for this request and verified
  // the session - reuse that result via the x-user-id header instead of
  // paying for a second auth round-trip here before anything can render.
  // Falls back to requireUser() if the header is ever missing (e.g. a
  // request that somehow bypassed middleware).
  const headerUserId = (await headers()).get("x-user-id");
  const supabase = await getSupabaseServerClient();
  const userId = headerUserId ?? (await requireUser()).user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_disabled")
    .eq("id", userId)
    .single();

  // Defense-in-depth alongside the real Supabase Auth ban (admin.actions.ts)
  // - covers the window where an already-issued access token is still
  // technically valid but the account has just been disabled.
  if (profile?.is_disabled) {
    await supabase.auth.signOut();
    redirect("/login?disabled=1");
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-1 flex-col">
      <NavBar isAdmin={isAdmin} />
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <MobileBottomNav isAdmin={isAdmin} />
    </div>
  );
}
