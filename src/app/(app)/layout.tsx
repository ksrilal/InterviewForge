import { NavBar } from "@/components/layout/nav-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
