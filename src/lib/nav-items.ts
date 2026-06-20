import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, MessageSquareText, History, Radar, BookOpen, CalendarCheck, Settings, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/interview/new", label: "Interview", icon: MessageSquareText },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/questions", label: "Questions", icon: BookOpen },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Appended only for admins (see (app)/layout.tsx) - not part of NAV_ITEMS
// itself since that array is also used for the non-role-aware mobile nav
// item count/layout.
export const ADMIN_NAV_ITEM: NavItem = { href: "/admin/users", label: "Users", icon: Users };
