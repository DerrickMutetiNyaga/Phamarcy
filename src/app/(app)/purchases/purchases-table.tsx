import Link from "next/link";
import { Pagination } from "@/components/data/pagination";
import { TABLE_SCROLL } from "@/components/data/panel";
import { PaymentStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PurchaseListResult } from "@/server/services/purchases";

export function PurchasesTable({
  result,
  currencySymbol,
  showSupplier = true,
}: {
  result: PurchaseListResult;
  currencySymbol: string;
  showSupplier?: boolean;
}) {
  const money = (v: number) => formatMoney(v, currencySymbol);
  return (
    <>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Purchase</TableHead>
            <TableHead>Date</TableHead>
            {showSupplier && <TableHead>Supplier</TableHead>}
            <TableHead>Supplier invoice</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((p) => (
            <TableRow key={p._id}>
              <TableCell>
                <Link href={`/purchases/${p._id}`} className="font-medium text-emerald-700 hover:underline">
                  {p.purchaseNo}
                </Link>
              </TableCell>
              <TableCell className="text-slate-600">{formatDate(p.date)}</TableCell>
              {showSupplier && (
                <TableCell>
                  <Link href={`/suppliers/${p.supplierId}`} className="hover:text-emerald-700 hover:underline">
                    {p.supplierName}
                  </Link>
                </TableCell>
              )}
              <TableCell className="text-slate-600">{p.supplierInvoiceNo || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{p.itemCount}</TableCell>
              <TableCell className="text-right font-semibold text-slate-900 tabular-nums">{money(p.total)}</TableCell>
              <TableCell className="text-right text-emerald-700 tabular-nums">{money(p.amountPaid)}</TableCell>
              <TableCell className={cn("text-right font-semibold tabular-nums", p.due > 0 ? "text-red-600" : "text-slate-400")}>{money(p.due)}</TableCell>
              <TableCell>
                <PaymentStatusBadge status={p.paymentStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={showSupplier ? 5 : 4}>Totals for {result.total} filtered purchases</TableCell>
            <TableCell className="text-right tabular-nums">{money(result.totals.total)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(result.totals.amountPaid)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(result.totals.due)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}
