"use client";

import { Minus, Plus, Printer, ScanBarcode, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMoney } from "@/components/providers/app-context";
import { RxBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { printInvoice } from "@/lib/client/print";
import { cn } from "@/lib/utils";
import { formatAmount, formatDate, round2 } from "@/lib/format";
import { priceCart } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/validators/sale";
import { UNIT_LABELS } from "@/lib/validators/medicine";
import type { PosMedicine } from "@/server/services/inventory";
import { type PosCustomer, PosCustomerPicker } from "./pos-customer";
import { type AttachedPrescription, PrescriptionPanel } from "./pos-prescription";

interface CartLine {
  medicine: PosMedicine;
  quantity: number;
  discountText: string;
}

function parseAmount(text: string): number {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

function describe(m: PosMedicine) {
  return [m.strength, UNIT_LABELS[m.unit]].filter(Boolean).join(" · ");
}

export function PosScreen() {
  const money = useMoney();

  const searchRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosMedicine[]>([]);
  const [resultsFor, setResultsFor] = useState("");
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [billDiscountText, setBillDiscountText] = useState("");
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [prescription, setPrescription] = useState<AttachedPrescription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tenderedText, setTenderedText] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; invoiceNo: string } | null>(null);

  const runSearch = useCallback(async (q: string): Promise<PosMedicine[] | null> => {
    requestRef.current?.abort();
    const trimmed = q.trim();
    lastQueryRef.current = trimmed;
    if (!trimmed) {
      setResults([]);
      setResultsFor("");
      return [];
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setSearching(true);
    try {
      const rows = await apiFetch<PosMedicine[]>(`/api/medicines/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      setResults(rows);
      setResultsFor(trimmed);
      setHighlight(0);
      return rows;
    } catch (error) {
      if (controller.signal.aborted) return null;
      toast.error(errorMessage(error));
      return [];
    } finally {
      if (requestRef.current === controller) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim() !== lastQueryRef.current) void runSearch(query);
    }, 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  function addToCart(m: PosMedicine) {
    if (m.stock <= 0) {
      toast.error(`${m.name} is out of stock`);
      return;
    }
    const existing = cart.find((l) => l.medicine._id === m._id);
    if (!existing) {
      setCart([...cart, { medicine: m, quantity: 1, discountText: "" }]);
    } else if (existing.quantity >= m.stock) {
      toast.warning(`Only ${m.stock} of ${m.name} in stock`);
    } else {
      setCart(cart.map((l) => (l.medicine._id === m._id ? { ...l, quantity: l.quantity + 1, medicine: m } : l)));
    }
    setQuery("");
    setResults([]);
    setResultsFor("");
    searchRef.current?.focus();
  }

  async function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setQuery("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      const rows = resultsFor === q ? results : await runSearch(q);
      if (rows === null) return;
      const exact = rows.find((r) => r.barcode && r.barcode === q);
      const pick = exact ?? rows[resultsFor === q ? highlight : 0];
      if (pick) addToCart(pick);
      else toast.error(`No medicine matches "${q}"`);
    }
  }

  const priced = useMemo(
    () =>
      priceCart(
        cart.map((l) => ({
          unitPrice: l.medicine.salePrice,
          quantity: l.quantity,
          discount: parseAmount(l.discountText),
          taxPercent: l.medicine.taxPercent,
        })),
        parseAmount(billDiscountText)
      ),
    [cart, billDiscountText]
  );

  const rxItems = cart.filter((l) => l.medicine.prescriptionRequired).map((l) => l.medicine.name);
  const tendered = parseAmount(tenderedText);
  const change = paymentMethod === "cash" && tendered > 0 ? round2(tendered - priced.grandTotal) : null;

  const blocker =
    cart.length === 0
      ? "Add at least one medicine"
      : cart.some((l, i) => parseAmount(l.discountText) > priced.lines[i].gross)
        ? "An item discount is larger than the item amount"
        : parseAmount(billDiscountText) > round2(priced.subtotal - priced.lineDiscountTotal)
          ? "Bill discount is larger than the bill amount"
          : rxItems.length > 0 && !prescription
            ? "Attach a verified prescription"
            : change !== null && change < 0
              ? "Amount received is less than the total"
              : null;

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.medicine._id === id ? { ...l, ...patch } : l)));
  }

  function setQuantity(line: CartLine, value: number) {
    if (!Number.isFinite(value)) return;
    const qty = Math.max(1, Math.min(Math.floor(value), line.medicine.stock));
    if (value > line.medicine.stock) toast.warning(`Only ${line.medicine.stock} of ${line.medicine.name} in stock`);
    updateLine(line.medicine._id, { quantity: qty });
  }

  function resetSale() {
    setCart([]);
    setBillDiscountText("");
    setCustomer(null);
    setPrescription(null);
    setPaymentMethod("cash");
    setTenderedText("");
    searchRef.current?.focus();
  }

  const checkout = useCallback(async () => {
    if (blocker || checkingOut) {
      if (blocker) toast.error(blocker);
      return;
    }
    setCheckingOut(true);
    try {
      const sale = await apiFetch<{ id: string; invoiceNo: string }>("/api/sales", {
        method: "POST",
        body: {
          customer: customer?._id ?? null,
          items: cart.map((l) => ({
            medicine: l.medicine._id,
            quantity: l.quantity,
            discount: parseAmount(l.discountText),
          })),
          billDiscount: parseAmount(billDiscountText),
          paymentMethod,
          amountTendered: paymentMethod === "cash" && tendered > 0 ? tendered : null,
          prescription: prescription?._id ?? null,
        },
      });
      toast.success(`Sale ${sale.invoiceNo} completed`);
      setLastSale(sale);
      resetSale();
      printInvoice(sale.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCheckingOut(false);
    }
  }, [blocker, checkingOut, customer, cart, billDiscountText, paymentMethod, tendered, prescription]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        void checkout();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checkout]);

  const showResults = query.trim().length > 0;

  return (
    <div className="grid h-[calc(100vh-6.5rem)] grid-cols-[minmax(0,1fr)_26rem] gap-4">
      <section className="flex min-h-0 flex-col rounded-md border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search by name, generic name, or scan barcode"
              className="h-10 pl-9 text-sm"
              aria-label="Search medicines"
              autoComplete="off"
            />
            <ScanBarcode className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!showResults ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-[13px] text-gray-500">
              <p>Type a medicine name or scan a barcode to begin.</p>
              <p className="text-xs text-gray-400">Up and Down to move, Enter to add, F2 to search, F9 to check out.</p>
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-gray-500">
              {searching || resultsFor !== query.trim() ? "Searching..." : "No sellable medicine matches this search."}
            </p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium">Medicine</th>
                  <th className="px-3 py-2 text-left font-medium">Nearest expiry</th>
                  <th className="px-3 py-2 text-right font-medium">In stock</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {results.map((m, i) => (
                  <tr
                    key={m._id}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => addToCart(m)}
                    className={cn(
                      "cursor-pointer border-b border-gray-100",
                      i === highlight ? "bg-emerald-50" : "hover:bg-gray-50",
                      m.stock <= 0 && "text-gray-400"
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{m.name}</span>
                        {m.prescriptionRequired && <RxBadge />}
                      </div>
                      <p className="text-xs text-gray-500">
                        {m.genericName}
                        {describe(m) ? ` · ${describe(m)}` : ""}
                        {m.barcode ? ` · ${m.barcode}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(m.nearestExpiry)}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums", m.stock <= 0 && "text-red-600")}>
                      {m.stock <= 0 ? "Out" : m.stock}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(m.salePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-y-auto rounded-md border border-gray-200 bg-white">
        <div className="space-y-2 border-b border-gray-200 p-3">
          <PosCustomerPicker customer={customer} onChange={setCustomer} />
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-gray-500">Cart is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((line, i) => {
                const p = priced.lines[i];
                return (
                  <li key={line.medicine._id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-gray-900">
                          {line.medicine.name}
                          {line.medicine.prescriptionRequired && <RxBadge />}
                        </p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {formatAmount(line.medicine.salePrice)} each
                          {line.medicine.taxPercent > 0 ? ` · tax ${line.medicine.taxPercent}%` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium tabular-nums">{formatAmount(p.total)}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${line.medicine.name}`}
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => setCart((prev) => prev.filter((l) => l.medicine._id !== line.medicine._id))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Decrease quantity"
                          disabled={line.quantity <= 1}
                          onClick={() => setQuantity(line, line.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={line.medicine.stock}
                          value={line.quantity}
                          onChange={(e) => setQuantity(line, e.target.valueAsNumber)}
                          className="mx-1 h-7 w-14 text-center tabular-nums"
                          aria-label="Quantity"
                        />
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Increase quantity"
                          disabled={line.quantity >= line.medicine.stock}
                          onClick={() => setQuantity(line, line.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-gray-400">of {line.medicine.stock}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Label htmlFor={`disc-${line.medicine._id}`} className="text-xs font-normal text-gray-500">
                          Discount
                        </Label>
                        <Input
                          id={`disc-${line.medicine._id}`}
                          inputMode="decimal"
                          value={line.discountText}
                          placeholder="0.00"
                          onChange={(e) => updateLine(line.medicine._id, { discountText: e.target.value.replace(/[^\d.]/g, "") })}
                          className={cn("h-7 w-20 text-right tabular-nums", parseAmount(line.discountText) > p.gross && "border-red-500")}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-200 p-3">
          <PrescriptionPanel
            rxItemNames={rxItems}
            attached={prescription}
            onAttach={setPrescription}
            customerName={customer?.name}
            customerPhone={customer?.phone}
          />

          <dl className="space-y-1 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="tabular-nums">{formatAmount(priced.subtotal)}</dd>
            </div>
            {priced.lineDiscountTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Item discounts</dt>
                <dd className="tabular-nums">-{formatAmount(priced.lineDiscountTotal)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt>
                <Label htmlFor="bill-discount" className="text-[13px] font-normal text-gray-500">
                  Bill discount
                </Label>
              </dt>
              <dd>
                <Input
                  id="bill-discount"
                  inputMode="decimal"
                  value={billDiscountText}
                  placeholder="0.00"
                  onChange={(e) => setBillDiscountText(e.target.value.replace(/[^\d.]/g, ""))}
                  className="h-7 w-24 text-right tabular-nums"
                />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax</dt>
              <dd className="tabular-nums">{formatAmount(priced.taxTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(priced.grandTotal)}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={paymentMethod === m}
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  "h-8 rounded-md border text-[13px] font-medium transition-colors",
                  paymentMethod === m
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <Label htmlFor="tendered" className="font-normal text-gray-500">
                Cash received
              </Label>
              <Input
                id="tendered"
                inputMode="decimal"
                value={tenderedText}
                placeholder={formatAmount(priced.grandTotal)}
                onChange={(e) => setTenderedText(e.target.value.replace(/[^\d.]/g, ""))}
                className="h-8 w-28 text-right tabular-nums"
              />
              <span className={cn("w-28 text-right tabular-nums", change !== null && change < 0 ? "text-red-600" : "text-gray-700")}>
                {change === null ? "" : change < 0 ? `Short ${formatAmount(-change)}` : `Change ${formatAmount(change)}`}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={cart.length === 0 || checkingOut}>
                  Clear
                </Button>
              }
              title="Clear this sale?"
              description="All items, discounts, the customer and the attached prescription will be removed from the cart."
              confirmLabel="Clear sale"
              destructive
              onConfirm={async () => resetSale()}
            />
            <Button className="h-9 flex-1" onClick={() => void checkout()} disabled={!!blocker || checkingOut} title={blocker ?? "F9"}>
              {checkingOut ? "Processing..." : `Charge ${money(priced.grandTotal)}`}
            </Button>
          </div>
          {blocker && cart.length > 0 && <p className="text-xs text-amber-600">{blocker}.</p>}
          {lastSale && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last sale {lastSale.invoiceNo}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                onClick={() => printInvoice(lastSale.id)}
              >
                <Printer className="size-3.5" />
                Reprint invoice
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
