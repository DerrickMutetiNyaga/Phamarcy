"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useApp } from "@/components/providers/app-context";
import { cn } from "@/lib/utils";
import { activeNavHref, navForRole } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const { user, settings } = useApp();
  const sections = navForRole(user.role);
  const active = activeNavHref(pathname);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-4">
        <Logo className="size-7" />
        <span className="truncate text-sm font-semibold text-gray-900">{settings.pharmacyName}</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-gray-400 uppercase">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.href === active;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        isActive
                          ? "bg-emerald-50 font-medium text-emerald-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("size-4", isActive ? "text-emerald-600" : "text-gray-400")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
