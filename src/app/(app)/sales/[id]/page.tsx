import { BadgePercent, FileText, Info, Landmark, Pill, Receipt, ShoppingBag, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DetailHero, KpiCard } from "@/components/data/detail-hero";
import { DetailGrid, Panel, PanelHeader } from "@/components/data/panel";
import { PaymentBadge, PrescriptionStatusBadge, SaleStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDate, formatDateTime, formatMoney, round2 } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { getSale } from "@/server/services/sales";
import { getSettings } from "@/server/settings";
import { RefundDialog, ReprintButton } from "./sale-actions";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(COUNTER_ROLES);
  const { id } = await params;
  const [sale, settings] = await Promise.all([getSale(id), getSettings()]);
  if (!sale) notFound();
  if (user.role === "cashier" && String(sale.soldBy?._id) !== user.id) notFound();
  const money = (v: number) => formatMoney(v, settings.currencySymbol);
  const change = sale.amountTendered !== null && sale.amountTendered !== undefined ? round2(sale.amountTendered - sale.grandTotal) : null;
  const refundable = user.role === "admin" && sale.status === "completed";
  const itemQty = sale.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4">
      <BackLink href="/sales" label="Sales history" />

      <DetailHero
        icon={Receipt}
        eyebrow="Invoice"
        title={sale.invoiceNo}
        subtitle={`${formatDateTime(sale.createdAt)} · ${sale.customerName}`}
        badges={
          <>
            <SaleStatusBadge status={sale.status} />
            <PaymentBadge method={sale.paymentMethod} />
          </>
        }
        actions={
          <>
            <ReprintButton saleId={id} />
            {refundable && <RefundDialog saleId={id} invoiceNo={sale.invoiceNo} total={money(sale.grandTotal)} />}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Grand total"
          value={money(sale.grandTotal)}
          icon={Wallet}
          tone={sale.status === "refunded" ? "rose" : "emerald"}
          note={sale.status === "refunded" ? "Refunded" : `Subtotal ${money(sale.subtotal)}`}
        />
        <KpiCard label="Units sold" value={itemQty.toLocaleString("en-US")} icon={ShoppingBag} tone="sky" note={`${sale.items.length} lines`} />
        <KpiCard label="Discounts" value={money(sale.discountTotal)} icon={BadgePercent} tone="amber" note={sale.billDiscount > 0 ? `Bill ${money(sale.billDiscount)}` : "Line discounts"} />
        <KpiCard label="Tax" value={money(sale.taxTotal)} icon={Landmark} tone="violet" note="Included in total" />
      </div>

      <Panel>
        <PanelHeader title="Sale details" icon={Info} tone="sky" />
        <DetailGrid
          items={[
            { label: "Date", value: formatDateTime(sale.createdAt) },
            {
              label: "Customer",
              value: sale.customer ? (
                <Link href={`/customers/${String(sale.customer)}`} className="text-emerald-700 hover:underline">
                  {sale.customerName}
                </Link>
              ) : (
                sale.customerName
              ),
            },
            { label: "Phone", value: sale.customerPhone || "-" },
            { label: "Status", value: <SaleStatusBadge status={sale.status} /> },
            { label: "Payment method", value: <PaymentBadge method={sale.paymentMethod} /> },
            { label: "Cash received", value: sale.amountTendered !== null && sale.amountTendered !== undefined ? money(sale.amountTendered) : "-" },
            { label: "Change given", value: change !== null ? money(change) : "-" },
            { label: "Sold by", value: sale.soldBy?.name ?? "-" },
          ]}
        />
        {sale.status === "refunded" && (
          <p className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700">
            <Undo2 className="size-4 shrink-0" />
            Refunded {sale.refundedAt ? formatDateTime(sale.refundedAt) : ""} by {sale.refundedBy?.name ?? "unknown"}: {sale.refundReason}
          </p>
        )}
      </Panel>

      {sale.prescription && (
        <Panel>
          <PanelHeader title="Prescription" icon={FileText} tone="violet" />
          <div className="flex items-center gap-4 px-4 py-3 text-[13px]">
            <a href={sale.prescription.imageUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
              {sale.prescription.customerName}, uploaded {formatDate(sale.prescription.createdAt)}
            </a>
            <PrescriptionStatusBadge status={sale.prescription.status} />
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Items" icon={Pill} tone="emerald" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch no.</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sale.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="font-mono text-xs">{item.batchNo}</TableCell>
                <TableCell>{formatDate(item.expiryDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.discount)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(item.tax)}
                  <span className="ml-1 text-xs text-slate-400">({item.taxPercent}%)</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3}>
                Subtotal {money(sale.subtotal)}
                {sale.billDiscount > 0 && <span className="ml-3 font-normal text-slate-500">incl. bill discount {money(sale.billDiscount)}</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{itemQty}</TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">{money(sale.discountTotal)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(sale.taxTotal)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(sale.grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Panel>
    </div>
  );
}
