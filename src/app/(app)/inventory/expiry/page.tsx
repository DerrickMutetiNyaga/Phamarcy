import Link from "next/link";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate, formatMoney, round2 } from "@/lib/format";
import { EXPIRY_WINDOW_LABELS, EXPIRY_WINDOWS } from "@/lib/report-types";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { oneOf, param, type SearchParams } from "@/server/query";
import { listExpiring } from "@/server/services/inventory";
import { getSettings } from "@/server/settings";

async function ExpiryTable({ sp }: { sp: SearchParams }) {
  const window = oneOf(sp, "window", EXPIRY_WINDOWS) || "30";
  const [rows, settings] = await Promise.all([
    listExpiring(window === "expired" ? 0 : Number(window), param(sp, "q")),
    getSettings(),
  ]);
  const money = (v: number) => formatMoney(v, settings.currencySymbol);

  if (rows.length === 0) {
    return (
      <Panel>
        <EmptyState message={window === "expired" ? "No expired stock on hand." : `No stock expiring in the ${EXPIRY_WINDOW_LABELS[window].toLowerCase()}.`} />
      </Panel>
    );
  }

  return (
    <Panel>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch no.</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead className="text-right">Days left</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Value at cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r._id} className={cn(r.daysLeft <= 0 && "bg-red-50/50")}>
              <TableCell>
                <Link href={`/inventory/${r.medicineId}`} className="font-medium hover:text-emerald-700 hover:underline">
                  {r.medicineName} {r.strength}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.batchNo}</TableCell>
              <TableCell>{formatDate(r.expiryDate)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.daysLeft <= 0 ? (
                  <Badge variant="danger">Expired</Badge>
                ) : (
                  <span className={cn(r.daysLeft <= 30 ? "text-red-600" : r.daysLeft <= 60 ? "text-amber-700" : "")}>{r.daysLeft}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{money(r.purchasePrice)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(r.costValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={4}>{rows.length} batches</TableCell>
            <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.quantity, 0)}</TableCell>
            <TableCell />
            <TableCell className="text-right tabular-nums">{money(round2(rows.reduce((s, r) => s + r.costValue, 0)))}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  );
}

export default async function ExpiryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search medicine or batch"
        exportHref="/api/reports/expiry"
        filters={[
          {
            key: "window",
            placeholder: "Window",
            defaultValue: "30",
            options: EXPIRY_WINDOWS.map((w) => ({ value: w, label: EXPIRY_WINDOW_LABELS[w] })),
          },
        ]}
      />
      <p className="text-xs text-gray-500">
        Only batches with stock on hand are listed. To write off expired stock, open the medicine and adjust the batch.
      </p>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={7} />}>
        <ExpiryTable sp={sp} />
      </Suspense>
    </div>
  );
}
