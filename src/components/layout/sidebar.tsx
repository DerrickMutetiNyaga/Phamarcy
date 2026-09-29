"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useApp } from "@/components/providers/app-context";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { activeNavHref, navForRole } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const { user, settings } = useApp();
  const sections = navForRole(user.role);
  const active = activeNavHref(pathname);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-gradient-to-b from-emerald-900 via-emerald-950 to-teal-950 text-emerald-50">
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
        <Logo className="size-8" inverted />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{settings.pharmacyName}</p>
          <p className="text-[11px] text-emerald-300/80">{ROLE_LABELS[user.role]} workspace</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-emerald-300/60 uppercase">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.href === active;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                        isActive
                          ? "bg-white/12 font-medium text-white shadow-sm ring-1 ring-white/10"
                          : "text-emerald-100/75 hover:bg-white/6 hover:text-white"
                      )}
                    >
                      {isActive && <span className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-full bg-emerald-400" />}
                      <Icon className={cn("size-4", isActive ? "text-emerald-300" : "text-emerald-300/60")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-emerald-300/60">Signed in as {user.name}</div>
    </aside>
  );
}
