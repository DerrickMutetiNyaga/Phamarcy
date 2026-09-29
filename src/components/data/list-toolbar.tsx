"use client";

import { Download, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  placeholder: string;
  options: FilterOption[];
  /** When set, the filter always has a value and cannot be cleared to "All". */
  defaultValue?: string;
  width?: string;
}

interface ListToolbarProps {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  dateRange?: boolean;
  exportHref?: string;
  children?: React.ReactNode;
}

const ALL = "__all";

export function ListToolbar({ searchPlaceholder, filters = [], dateRange, exportHref, children }: ListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() || null }), 300);
  }

  const [exportPath, exportQuery] = (exportHref ?? "").split("?");
  const exportParams = new URLSearchParams(searchParams.toString());
  new URLSearchParams(exportQuery ?? "").forEach((value, key) => exportParams.set(key, value));
  exportParams.delete("page");
  exportParams.set("format", "csv");

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to")) ||
    filters.some((f) => !f.defaultValue && searchParams.get(f.key));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/80">
      {searchPlaceholder !== undefined && (
        <div className="relative w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-emerald-600" />
          <Input
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (timer.current) clearTimeout(timer.current);
              update({ q: query.trim() || null });
            }}
            placeholder={searchPlaceholder}
            className="bg-white pl-8"
            aria-label="Search"
          />
        </div>
      )}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? filter.defaultValue ?? ALL}
          onValueChange={(v) => update({ [filter.key]: v === ALL ? null : v })}
        >
          <SelectTrigger className={cn("bg-white", filter.width ?? "w-40")} aria-label={filter.placeholder}>
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent position="popper">
            {!filter.defaultValue && <SelectItem value={ALL}>{filter.placeholder}</SelectItem>}
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {dateRange && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From date"
            className="w-36 bg-white"
            value={searchParams.get("from") ?? ""}
            max={searchParams.get("to") ?? undefined}
            onChange={(e) => update({ from: e.target.value || null })}
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="date"
            aria-label="To date"
            className="w-36 bg-white"
            value={searchParams.get("to") ?? ""}
            min={searchParams.get("from") ?? undefined}
            onChange={(e) => update({ to: e.target.value || null })}
          />
        </div>
      )}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={() => {
            setQuery("");
            const reset: Record<string, null> = { q: null, from: null, to: null };
            filters.forEach((f) => {
              if (!f.defaultValue) reset[f.key] = null;
            });
            update(reset);
          }}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {exportHref && (
          <Button variant="outline" asChild>
            <a href={`${exportPath}?${exportParams.toString()}`} download>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
