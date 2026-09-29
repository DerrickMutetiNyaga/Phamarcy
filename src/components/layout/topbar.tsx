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
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-[15px] font-semibold text-gray-900">{titleForPath(pathname)}</h1>
      <div className="flex items-center gap-4">
        <span className="hidden text-[13px] text-gray-500 md:inline">{settings.pharmacyName}</span>
        <span className="h-5 w-px bg-gray-200" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-600/40">
            <span className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[11px] font-medium text-gray-700">
              {initials}
            </span>
            <span className="hidden sm:inline">{user.name}</span>
            <ChevronDown className="size-3.5 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <p className="mt-0.5 text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
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
