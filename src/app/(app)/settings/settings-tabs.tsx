"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS_CLASS, navTabClass } from "@/components/data/nav-tabs";

const TABS = [
  { href: "/settings", label: "General" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/audit", label: "Audit log" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className={NAV_TABS_CLASS} aria-label="Settings">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={navTabClass(pathname === t.href)}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
