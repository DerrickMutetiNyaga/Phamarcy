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
    <div className={cn("min-h-screen bg-gradient-to-b from-emerald-50 to-slate-100 py-6 print:bg-white print:p-0", embed && "bg-white py-0")}>
      <style>{`
        @page { size: ${paper.page}; margin: 0; }
        .invoice-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          html, body { background: #fff !important; }
          .invoice-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; min-height: auto !important; }
        }
      `}</style>
      {!embed && <InvoiceToolbar saleId={id} size={size} autoPrint={param(sp, "print") === "1"} />}

      <article
        className="invoice-sheet relative mx-auto overflow-hidden rounded-sm border border-slate-200 bg-white text-[11px] leading-snug text-slate-900 shadow-lg shadow-emerald-900/10"
        style={{ width: paper.width, minHeight: size === "a5" ? "210mm" : "297mm", padding: paper.padding }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        {sale.status === "refunded" && (
          <div className="absolute top-4 right-4 rotate-6 rounded border-2 border-red-600 px-2 py-0.5 text-xs font-bold tracking-wide text-red-600 uppercase">
            Refunded
          </div>
        )}

        <header className="border-b-2 border-emerald-600 pb-3 text-center">
          <h1 className="text-base font-bold text-emerald-800">{settings.pharmacyName}</h1>
          {settings.address && <p className="whitespace-pre-line text-slate-700">{settings.address}</p>}
          <p className="text-slate-700">
            {[settings.phone && `Tel: ${settings.phone}`, settings.taxNumber && `Tax no: ${settings.taxNumber}`].filter(Boolean).join("  |  ")}
          </p>
        </header>

        <div className="flex justify-between gap-6 border-b border-slate-200 py-2.5">
          <div>
            <p className="mb-0.5 inline-block rounded bg-emerald-600 px-1.5 py-px text-[10px] font-bold tracking-wider text-white uppercase">Tax invoice</p>
            <p>
              <span className="text-slate-500">Invoice no:</span> {sale.invoiceNo}
            </p>
            <p>
              <span className="text-slate-500">Date:</span> {formatDateTime(sale.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{sale.customerName}</p>
            {sale.customerPhone && <p>{sale.customerPhone}</p>}
            <p>
              <span className="text-slate-500">Payment:</span> {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
            </p>
          </div>
        </div>

        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-emerald-200 bg-emerald-50 text-left text-[10px] text-emerald-900 uppercase">
              <th className="py-1 pr-1 pl-1 font-medium">#</th>
              <th className="py-1 pr-1 font-medium">Item</th>
              <th className="py-1 pr-1 text-right font-medium">Qty</th>
              <th className="py-1 pr-1 text-right font-medium">Rate</th>
              <th className="py-1 pr-1 text-right font-medium">Disc</th>
              <th className="py-1 pr-1 text-right font-medium">Tax</th>
              <th className="py-1 pr-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="py-1 pr-1 pl-1 text-slate-500">{i + 1}</td>
                <td className="py-1 pr-1">
                  {item.name}
                  <p className="text-[10px] text-slate-500">
                    Batch {item.batchNo} · Exp {formatDate(item.expiryDate)}
                  </p>
                </td>
                <td className="py-1 pr-1 text-right tabular-nums">{item.quantity}</td>
                <td className="py-1 pr-1 text-right tabular-nums">{formatMoney(item.unitPrice, "")}</td>
                <td className="py-1 pr-1 text-right tabular-nums">{formatMoney(item.discount, "")}</td>
                <td className="py-1 pr-1 text-right tabular-nums">
                  {formatMoney(item.tax, "")}
                  <p className="text-[10px] text-slate-500">{item.taxPercent}%</p>
                </td>
                <td className="py-1 pr-1 text-right font-medium tabular-nums">{formatMoney(item.total, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between gap-6">
          <div className="text-slate-600">
            <p>Items: {itemCount}</p>
            <p>Served by: {sale.soldBy?.name ?? "-"}</p>
            {sale.prescription && <p>Dispensed against prescription dated {formatDate(sale.prescription.createdAt)}</p>}
          </div>
          <dl className="w-52 space-y-0.5 tabular-nums">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{money(sale.subtotal)}</dd>
            </div>
            {sale.discountTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount</dt>
                <dd>-{money(sale.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">Tax</dt>
              <dd>{money(sale.taxTotal)}</dd>
            </div>
            <div className="my-1 flex justify-between rounded bg-emerald-700 px-2 py-1 text-sm font-bold text-white">
              <dt>Total</dt>
              <dd>{money(sale.grandTotal)}</dd>
            </div>
            {tendered !== null && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Cash received</dt>
                  <dd>{money(tendered)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Change</dt>
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

        <footer className="mt-6 border-t-2 border-emerald-600 pt-2 text-center text-slate-600">
          {settings.receiptFooter && <p className="whitespace-pre-line">{settings.receiptFooter}</p>}
        </footer>
      </article>
    </div>
  );
}
