"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { BackLink } from "@/components/data/detail-hero";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InvoiceToolbar({ saleId, size, autoPrint }: { saleId: string; size: "a5" | "a4"; autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between">
      <BackLink href={`/sales/${saleId}`} label="Back to sale" />
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-white p-0.5 text-xs shadow-xs ring-1 ring-slate-200">
          {(["a5", "a4"] as const).map((s) => (
            <Link
              key={s}
              href={`/invoice/${saleId}?size=${s}`}
              replace
              className={cn(
                "rounded-md px-3 py-1 font-semibold transition-colors",
                size === s ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              {s.toUpperCase()}
            </Link>
          ))}
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
