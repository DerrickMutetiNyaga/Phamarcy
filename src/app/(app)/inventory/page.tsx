import { Pill, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { RxBadge, StockBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { categoryToneMap, DEFAULT_CATEGORY_TONE } from "@/lib/category-tones";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UNIT_LABELS } from "@/lib/validators/medicine";
import { requireUser } from "@/server/auth";
import { oneOf, pageParam, param, type SearchParams } from "@/server/query";
import { listCategoryOptions, listMedicines, STOCK_FILTERS } from "@/server/services/inventory";
import { getSettings } from "@/server/settings";

async function MedicinesTable({ sp, categoryNames }: { sp: SearchParams; categoryNames: string[] }) {
  const tones = categoryToneMap(categoryNames);
  const [result, settings] = await Promise.all([
    listMedicines({
      q: param(sp, "q"),
      category: param(sp, "category"),
      stock: oneOf(sp, "stock", STOCK_FILTERS),
      status: oneOf(sp, "status", ["active", "inactive"] as const),
      page: pageParam(sp),
    }),
    getSettings(),
  ]);
  const filtered = ["q", "category", "stock", "status"].some((k) => param(sp, k));

  if (result.total === 0) {
    return (
      <Panel>
        {filtered ? (
          <EmptyState message="No medicines match these filters." />
        ) : (
          <EmptyState
            message="No medicines yet."
            action={
              <Button asChild>
                <Link href="/inventory/new">Add your first medicine</Link>
              </Button>
            }
          />
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Reorder at</TableHead>
            <TableHead>Nearest expiry</TableHead>
            <TableHead className="text-right">Sale price</TableHead>
            <TableHead className="text-right">Tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((m) => {
            const out = m.stock === 0;
            const low = !out && m.stock <= m.reorderLevel;
            const tone = tones.get(m.categoryName) ?? DEFAULT_CATEGORY_TONE;
            return (
              <TableRow key={m._id} className={cn(out && "bg-red-50/50", low && "bg-amber-50/60")}>
                <TableCell className="max-w-80">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone.tile)}>
                      <Pill className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/inventory/${m._id}`} className="truncate font-semibold text-slate-900 hover:text-emerald-700 hover:underline">
                          {m.name} {m.strength}
                        </Link>
                        {m.prescriptionRequired && <RxBadge />}
                        {!m.isActive && <Badge>Inactive</Badge>}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {m.genericName}
                        {m.brand ? ` · ${m.brand}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <span className={cn("size-2 rounded-full", tone.dot)} />
                    {m.categoryName}
                  </span>
                </TableCell>
                <TableCell>{UNIT_LABELS[m.unit]}</TableCell>
                <TableCell className="font-mono text-xs text-slate-600">{m.barcode || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="mr-2">
                    <StockBadge stock={m.stock} reorderLevel={m.reorderLevel} />
                  </span>
                  <span className={cn("font-medium", out && "text-red-600", low && "text-amber-700")}>{m.stock}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">{m.reorderLevel}</TableCell>
                <TableCell className="text-slate-600">{formatDate(m.nearestExpiry)}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-800 tabular-nums">{formatMoney(m.salePrice, settings.currencySymbol)}</TableCell>
                <TableCell className="text-right tabular-nums text-slate-600">{m.taxPercent}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </Panel>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const [sp, categories] = await Promise.all([searchParams, listCategoryOptions()]);

  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search name, generic, brand or scan barcode"
        exportHref="/api/medicines"
        filters={[
          { key: "category", placeholder: "All categories", options: categories, width: "w-44" },
          {
            key: "stock",
            placeholder: "All stock levels",
            options: [
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
              { value: "in", label: "In stock" },
            ],
          },
          {
            key: "status",
            placeholder: "Any status",
            width: "w-32",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
      >
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="size-4" />
            Add medicine
          </Link>
        </Button>
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={9} />}>
        <MedicinesTable sp={sp} categoryNames={categories.map((c) => c.label)} />
      </Suspense>
    </div>
  );
}
