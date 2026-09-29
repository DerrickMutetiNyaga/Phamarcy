"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { titleForPath } from "./nav";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, settings } = useApp();

  async function signOut() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-emerald-900/10 bg-white/85 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
        <h1 className="text-base font-semibold text-slate-900">{titleForPath(pathname)}</h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-[13px] text-slate-700 outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600/40">
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-semibold text-white shadow-sm">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block font-medium text-slate-900">{user.name}</span>
              <span className="block text-[11px] text-slate-500">
                {ROLE_LABELS[user.role]} · {settings.pharmacyName}
              </span>
            </span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <p className="mt-0.5 text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
