import Link from "next/link";
import { Pagination } from "@/components/data/pagination";
import { TABLE_SCROLL } from "@/components/data/panel";
import { SaleStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/validators/sale";
import type { SaleListResult } from "@/server/services/sales";

export function SalesTable({
  result,
  currencySymbol,
  showCustomer = true,
}: {
  result: SaleListResult;
  currencySymbol: string;
  showCustomer?: boolean;
}) {
  const money = (v: number) => formatMoney(v, currencySymbol);
  return (
    <>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            {showCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Payment</TableHead>
            <TableHead>Sold by</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((s) => (
            <TableRow key={s._id}>
              <TableCell>
                <Link href={`/sales/${s._id}`} className="font-medium text-emerald-700 hover:underline">
                  {s.invoiceNo}
                </Link>
              </TableCell>
              <TableCell className="text-gray-600">{formatDateTime(s.createdAt)}</TableCell>
              {showCustomer && (
                <TableCell>
                  {s.customerName}
                  {s.customerPhone && <span className="ml-1.5 text-xs text-gray-500">{s.customerPhone}</span>}
                </TableCell>
              )}
              <TableCell>{PAYMENT_METHOD_LABELS[s.paymentMethod]}</TableCell>
              <TableCell className="text-gray-600">{s.soldByName}</TableCell>
              <TableCell className="text-right tabular-nums">{s.itemCount}</TableCell>
              <TableCell className={cn("text-right tabular-nums", s.status === "refunded" && "text-gray-400 line-through")}>
                {money(s.grandTotal)}
              </TableCell>
              <TableCell>
                <SaleStatusBadge status={s.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={showCustomer ? 6 : 5}>Revenue from completed sales in this filter ({result.total} invoices)</TableCell>
            <TableCell className="text-right tabular-nums">{money(result.totalRevenue)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}
