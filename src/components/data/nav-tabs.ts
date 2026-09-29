import { cn } from "@/lib/utils";

export const NAV_TABS_CLASS = "inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80";

export function navTabClass(active: boolean): string {
  return cn(
    "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
    active
      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-700/20"
      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
  );
}
