import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDate, formatDateTime, formatMoney, round2 } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/validators/sale";
import { requireUser } from "@/server/auth";
import { param, type SearchParams } from "@/server/query";
import { getSale } from "@/server/services/sales";
import { getSettings } from "@/server/settings";
import { InvoiceToolbar } from "./invoice-toolbar";

export const metadata: Metadata = { title: "Invoice" };

const PAPER = {
  a5: { page: "A5", width: "148mm", padding: "10mm" },
  a4: { page: "A4", width: "210mm", padding: "14mm" },
} as const;

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser(COUNTER_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [sale, settings] = await Promise.all([getSale(id), getSettings()]);
  if (!sale) notFound();
  if (user.role === "cashier" && String(sale.soldBy?._id) !== user.id) notFound();

  const size = param(sp, "size") === "a4" ? "a4" : "a5";
  const embed = param(sp, "embed") === "1";
  const paper = PAPER[size];
  const money = (v: number) => formatMoney(v, settings.currencySymbol);
  const tendered = sale.amountTendered ?? null;
  const itemCount = sale.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className={cn("min-h-screen bg-gray-100 py-6 print:bg-white print:p-0", embed && "bg-white py-0")}>
      <style>{`
        @page { size: ${paper.page}; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .invoice-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; min-height: auto !important; }
        }
      `}</style>
      {!embed && <InvoiceToolbar saleId={id} size={size} autoPrint={param(sp, "print") === "1"} />}

      <article
        className="invoice-sheet relative mx-auto border border-gray-200 bg-white text-[11px] leading-snug text-gray-900 shadow-sm"
        style={{ width: paper.width, minHeight: size === "a5" ? "210mm" : "297mm", padding: paper.padding }}
      >
        {sale.status === "refunded" && (
          <div className="absolute top-4 right-4 rounded border border-red-600 px-2 py-0.5 text-xs font-semibold tracking-wide text-red-600 uppercase">
            Refunded
          </div>
        )}

        <header className="border-b border-gray-300 pb-3 text-center">
          <h1 className="text-base font-bold">{settings.pharmacyName}</h1>
          {settings.address && <p className="whitespace-pre-line text-gray-700">{settings.address}</p>}
          <p className="text-gray-700">
            {[settings.phone && `Tel: ${settings.phone}`, settings.taxNumber && `Tax no: ${settings.taxNumber}`].filter(Boolean).join("  |  ")}
          </p>
        </header>

        <div className="flex justify-between gap-6 border-b border-gray-300 py-2.5">
          <div>
            <p className="text-xs font-semibold uppercase">Tax invoice</p>
            <p>
              <span className="text-gray-500">Invoice no:</span> {sale.invoiceNo}
            </p>
            <p>
              <span className="text-gray-500">Date:</span> {formatDateTime(sale.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{sale.customerName}</p>
            {sale.customerPhone && <p>{sale.customerPhone}</p>}
            <p>
              <span className="text-gray-500">Payment:</span> {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
            </p>
          </div>
        </div>

        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left text-[10px] text-gray-600 uppercase">
              <th className="py-1 pr-1 font-medium">#</th>
              <th className="py-1 pr-1 font-medium">Item</th>
              <th className="py-1 pr-1 text-right font-medium">Qty</th>
              <th className="py-1 pr-1 text-right font-medium">Rate</th>
              <th className="py-1 pr-1 text-right font-medium">Disc</th>
              <th className="py-1 pr-1 text-right font-medium">Tax</th>
              <th className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100 align-top">
                <td className="py-1 pr-1 text-gray-500">{i + 1}</td>
                <td className="py-1 pr-1">
                  {item.name}
                  <p className="text-[10px] text-gray-500">
                    Batch {item.batchNo} · Exp {formatDate(item.expiryDate)}
                  </p>
                </td>
                <td className="py-1 pr-1 text-right tabular-nums">{item.quantity}</td>
                <td className="py-1 pr-1 text-right tabular-nums">{formatMoney(item.unitPrice, "")}</td>
                <td className="py-1 pr-1 text-right tabular-nums">{formatMoney(item.discount, "")}</td>
                <td className="py-1 pr-1 text-right tabular-nums">
                  {formatMoney(item.tax, "")}
                  <p className="text-[10px] text-gray-500">{item.taxPercent}%</p>
                </td>
                <td className="py-1 text-right tabular-nums">{formatMoney(item.total, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between gap-6">
          <div className="text-gray-600">
            <p>Items: {itemCount}</p>
            <p>Served by: {sale.soldBy?.name ?? "-"}</p>
            {sale.prescription && <p>Dispensed against prescription dated {formatDate(sale.prescription.createdAt)}</p>}
          </div>
          <dl className="w-52 space-y-0.5 tabular-nums">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>{money(sale.subtotal)}</dd>
            </div>
            {sale.discountTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Discount</dt>
                <dd>-{money(sale.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Tax</dt>
              <dd>{money(sale.taxTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-bold">
              <dt>Total</dt>
              <dd>{money(sale.grandTotal)}</dd>
            </div>
            {tendered !== null && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Cash received</dt>
                  <dd>{money(tendered)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Change</dt>
                  <dd>{money(round2(tendered - sale.grandTotal))}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {sale.status === "refunded" && sale.refundedAt && (
          <p className="mt-3 text-red-700">
            Refunded on {formatDate(sale.refundedAt)}: {sale.refundReason}
          </p>
        )}

        <footer className="mt-6 border-t border-gray-300 pt-2 text-center text-gray-600">
          {settings.receiptFooter && <p className="whitespace-pre-line">{settings.receiptFooter}</p>}
        </footer>
      </article>
    </div>
  );
}
