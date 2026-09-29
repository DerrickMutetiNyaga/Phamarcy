import { Boxes, CircleDollarSign, Coins, HandCoins, Info, PackagePlus, StickyNote, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DetailHero, KpiCard } from "@/components/data/detail-hero";
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
  const unitQty = purchase.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4">
      <BackLink href="/purchases" label="Purchases" />

      <DetailHero
        icon={Truck}
        eyebrow="Purchase"
        title={purchase.purchaseNo}
        subtitle={`${purchase.supplier?.name ?? "Unknown supplier"} · ${formatDate(purchase.date)}`}
        badges={<PaymentStatusBadge status={purchase.paymentStatus} />}
        actions={due > 0 ? <RecordPaymentDialog purchaseId={id} due={due} /> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Purchase total" value={money(purchase.total)} icon={Coins} tone="sky" note={`${purchase.items.length} lines`} />
        <KpiCard label="Paid" value={money(purchase.amountPaid)} icon={Wallet} tone="emerald" note={`${purchase.payments.length} payments`} />
        <KpiCard
          label="Balance due"
          value={money(due)}
          icon={CircleDollarSign}
          tone={due > 0 ? "rose" : "teal"}
          note={due > 0 ? "Owed to supplier" : "Fully paid"}
        />
        <KpiCard label="Units received" value={unitQty.toLocaleString("en-US")} icon={Boxes} tone="violet" note="Added to stock" />
      </div>

      <Panel>
        <PanelHeader title="Purchase details" icon={Info} tone="sky" />
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
        {purchase.notes && (
          <p className="flex items-start gap-2 border-t border-amber-100 bg-amber-50/70 px-4 py-2.5 text-[13px] text-amber-900">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />
            {purchase.notes}
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Items received" icon={PackagePlus} tone="teal" />
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
              <TableCell className="text-right tabular-nums">{unitQty}</TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">{money(purchase.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Panel>

      <Panel>
        <PanelHeader title="Payments" icon={HandCoins} tone="emerald" />
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
                  <TableCell className="text-slate-600">{formatDateTime(p.date)}</TableCell>
                  <TableCell>{p.note || "-"}</TableCell>
                  <TableCell className="text-slate-600">{p.user?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700 tabular-nums">{money(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
