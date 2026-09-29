"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

function pageList(current: number, last: number): (number | "gap")[] {
  const pages = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const last = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function href(p: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const base = "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium";
  const enabled = "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800";
  const disabled = "pointer-events-none border-slate-100 bg-white text-slate-300";

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
      <span>
        {start}-{end} of {total.toLocaleString("en-US")}
      </span>
      {last > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Link href={href(page - 1)} className={cn(base, page <= 1 ? disabled : enabled)} aria-label="Previous page" scroll={false}>
            <ChevronLeft className="size-3.5" />
          </Link>
          {pageList(page, last).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-gray-400">
                ...
              </span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                scroll={false}
                aria-current={p === page ? "page" : undefined}
                className={cn(base, p === page ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-700/20" : enabled)}
              >
                {p}
              </Link>
            )
          )}
          <Link href={href(page + 1)} className={cn(base, page >= last ? disabled : enabled)} aria-label="Next page" scroll={false}>
            <ChevronRight className="size-3.5" />
          </Link>
        </nav>
      )}
    </div>
  );
}
