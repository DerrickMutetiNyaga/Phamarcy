"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "General" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/audit", label: "Audit log" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-200" aria-label="Settings">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium",
            pathname === t.href ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
