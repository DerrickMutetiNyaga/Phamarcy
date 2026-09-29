import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailGrid, EmptyState, Panel, PanelHeader } from "@/components/data/panel";
import { PaymentStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate, formatDateTime, formatMoney, round2 } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { getPurchase } from "@/server/services/purchases";
import { getSettings } from "@/server/settings";
import { RecordPaymentDialog } from "./payment-dialog";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(INVENTORY_ROLES);
  const { id } = await params;
  const [purchase, settings] = await Promise.all([getPurchase(id), getSettings()]);
  if (!purchase) notFound();
  const money = (v: number) => formatMoney(v, settings.currencySymbol);
  const due = round2(purchase.total - purchase.amountPaid);

  return (
    <div className="space-y-4">
      <Link href="/purchases" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" />
        Purchases
      </Link>

      <Panel>
        <PanelHeader
          title={`Purchase ${purchase.purchaseNo}`}
          actions={due > 0 ? <RecordPaymentDialog purchaseId={id} due={due} /> : undefined}
        />
        <DetailGrid
          items={[
            {
              label: "Supplier",
              value: purchase.supplier ? (
                <Link href={`/suppliers/${String(purchase.supplier._id)}`} className="text-emerald-700 hover:underline">
                  {purchase.supplier.name}
                </Link>
              ) : (
                "-"
              ),
            },
            { label: "Purchase date", value: formatDate(purchase.date) },
            { label: "Supplier invoice", value: purchase.supplierInvoiceNo || "-" },
            { label: "Recorded by", value: purchase.createdBy?.name ?? "-" },
            { label: "Total", value: money(purchase.total) },
            { label: "Paid", value: money(purchase.amountPaid) },
            { label: "Balance due", value: <span className={due > 0 ? "text-red-600" : ""}>{money(due)}</span> },
            { label: "Payment status", value: <PaymentStatusBadge status={purchase.paymentStatus} /> },
          ]}
        />
        {purchase.notes && <p className="border-t border-gray-100 px-4 py-2.5 text-[13px] text-gray-600">{purchase.notes}</p>}
      </Panel>

      <Panel>
        <PanelHeader title="Items received" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch no.</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Link href={`/inventory/${String(item.medicine)}`} className="hover:text-emerald-700 hover:underline">
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.batchNo}</TableCell>
                <TableCell>{formatDate(item.expiryDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.unitCost)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right tabular-nums">{purchase.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">{money(purchase.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Panel>

      <Panel>
        <PanelHeader title="Payments" />
        {purchase.payments.length === 0 ? (
          <EmptyState message="No payments recorded." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.payments.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-600">{formatDateTime(p.date)}</TableCell>
                  <TableCell>{p.note || "-"}</TableCell>
                  <TableCell className="text-gray-600">{p.user?.name ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
