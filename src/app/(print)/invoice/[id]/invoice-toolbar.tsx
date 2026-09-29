"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
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
      <Link href={`/sales/${saleId}`} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" />
        Back to sale
      </Link>
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-gray-300 bg-white p-0.5 text-xs">
          {(["a5", "a4"] as const).map((s) => (
            <Link
              key={s}
              href={`/invoice/${saleId}?size=${s}`}
              replace
              className={cn("rounded px-2.5 py-1 font-medium", size === s ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:text-gray-900")}
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
