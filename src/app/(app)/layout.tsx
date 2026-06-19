import { redirect } from "next/navigation";
import { NavBar } from "@/components/layout/nav-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { requireUser } from "@/lib/auth/guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_disabled")
    .eq("id", user.id)
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
