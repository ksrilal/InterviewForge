"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth.actions";

interface NavBarProps {
  isAdmin: boolean;
}

export function NavBar({ isAdmin }: NavBarProps) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <header className="hidden md:flex sticky top-0 z-50 items-center justify-between border-b border-border bg-card/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <Link href="/dashboard" className="font-semibold tracking-tight text-foreground">
        InterviewForge
      </Link>
      <nav>
        <ul className="flex items-center gap-1">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Log out
        </Button>
      </form>
    </header>
  );
}
