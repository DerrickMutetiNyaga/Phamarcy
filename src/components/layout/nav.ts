import {
  BarChart3,
  Building2,
  CalendarClock,
  FileText,
  LayoutDashboard,
  PackagePlus,
  Pill,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canAccessPage } from "@/lib/auth/access";
import type { Role } from "@/lib/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: "Counter",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "Point of sale", icon: ShoppingCart },
      { href: "/sales", label: "Sales history", icon: Receipt },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/prescriptions", label: "Prescriptions", icon: FileText },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/inventory", label: "Medicines", icon: Pill },
      { href: "/inventory/categories", label: "Categories", icon: Tags },
      { href: "/inventory/expiry", label: "Expiry", icon: CalendarClock },
      { href: "/purchases", label: "Purchases", icon: PackagePlus },
      { href: "/suppliers", label: "Suppliers", icon: Building2 },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function navForRole(role: Role): NavSection[] {
  return SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => canAccessPage(role, i.href)) })).filter(
    (s) => s.items.length > 0
  );
}

export function activeNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.length) best = item.href;
      }
    }
  }
  return best;
}

const TITLE_OVERRIDES: [RegExp, string][] = [
  [/^\/inventory\/new$/, "New medicine"],
  [/^\/inventory\/[^/]+\/edit$/, "Edit medicine"],
  [/^\/inventory\/(?!categories|expiry)[^/]+$/, "Medicine details"],
  [/^\/purchases\/new$/, "New purchase"],
  [/^\/purchases\/[^/]+$/, "Purchase details"],
  [/^\/sales\/[^/]+$/, "Sale details"],
  [/^\/suppliers\/[^/]+$/, "Supplier details"],
  [/^\/customers\/[^/]+$/, "Customer details"],
  [/^\/settings\/users$/, "Users"],
  [/^\/settings\/audit$/, "Audit log"],
  [/^\/forbidden$/, "Access denied"],
];

export function titleForPath(pathname: string): string {
  for (const [pattern, title] of TITLE_OVERRIDES) if (pattern.test(pathname)) return title;
  const href = activeNavHref(pathname);
  for (const section of SECTIONS) for (const item of section.items) if (item.href === href) return item.label;
  return "";
}
