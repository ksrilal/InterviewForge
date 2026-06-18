import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, MessageSquareText, Radar, BookOpen, CalendarCheck, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/interview/new", label: "Interview", icon: MessageSquareText },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/questions", label: "Questions", icon: BookOpen },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];
