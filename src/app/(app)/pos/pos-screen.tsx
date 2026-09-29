"use client";

import {
  Banknote,
  CreditCard,
  Minus,
  PackageSearch,
  Pill,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMoney } from "@/components/providers/app-context";
import { RxBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryToneMap, DEFAULT_CATEGORY_TONE } from "@/lib/category-tones";
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

const PAYMENT_STYLES: Record<PaymentMethod, { icon: LucideIcon; idle: string; active: string }> = {
  cash: {
    icon: Banknote,
    idle: "text-amber-700 hover:border-amber-300 hover:bg-amber-50",
    active: "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20",
  },
  mpesa: {
    icon: Smartphone,
    idle: "text-mpesa hover:border-mpesa/50 hover:bg-mpesa/5",
    active: "border-mpesa bg-mpesa text-white ring-2 ring-mpesa/25",
  },
  card: {
    icon: CreditCard,
    idle: "text-sky-700 hover:border-sky-300 hover:bg-sky-50",
    active: "border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20",
  },
};

function parseAmount(text: string): number {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

function describe(m: PosMedicine) {
  return [m.strength, UNIT_LABELS[m.unit]].filter(Boolean).join(" · ");
}

function StockPill({ m }: { m: PosMedicine }) {
  if (m.stock <= 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Out of stock</span>;
  if (m.stock <= m.reorderLevel)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 tabular-nums">{m.stock} left</span>;
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 tabular-nums">{m.stock} in stock</span>
  );
}

export function PosScreen() {
  const money = useMoney();

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef("");
  const [catalog, setCatalog] = useState<PosMedicine[] | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [category, setCategory] = useState("");
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
      setHighlight(0);
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
    let active = true;
    apiFetch<PosMedicine[]>("/api/medicines/search")
      .then((rows) => {
        if (active) setCatalog(rows);
      })
      .catch((error) => {
        if (!active) return;
        setCatalog([]);
        toast.error(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [catalogVersion]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim() !== lastQueryRef.current) void runSearch(query);
    }, 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of catalog ?? []) if (m.categoryName) counts.set(m.categoryName, (counts.get(m.categoryName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);
  const toneByCategory = useMemo(() => categoryToneMap(categories.map(([name]) => name)), [categories]);
  const toneFor = (categoryName: string) => toneByCategory.get(categoryName) ?? DEFAULT_CATEGORY_TONE;

  const browseRows = useMemo(() => {
    const list = (catalog ?? []).filter((m) => !category || m.categoryName === category);
    return [...list].sort((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0));
  }, [catalog, category]);

  const showResults = query.trim().length > 0;
  const rows = showResults ? results : browseRows;
  const cartQty = useMemo(() => new Map(cart.map((l) => [l.medicine._id, l.quantity])), [cart]);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  function moveHighlight(index: number) {
    setHighlight(index);
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function chooseCategory(name: string) {
    setCategory(name);
    setHighlight(0);
    listRef.current?.scrollTo({ top: 0 });
    searchRef.current?.focus();
  }

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
      moveHighlight(Math.min(highlight + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(Math.max(highlight - 1, 0));
    } else if (e.key === "Escape") {
      setQuery("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = query.trim();
      if (!q) {
        const item = browseRows[highlight];
        if (item) addToCart(item);
        return;
      }
      const found = resultsFor === q ? results : await runSearch(q);
      if (found === null) return;
      const exact = found.find((r) => r.barcode && r.barcode === q);
      const pick = exact ?? found[resultsFor === q ? highlight : 0];
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
      setCatalogVersion((v) => v + 1);
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

  return (
    <div className="grid h-[calc(100vh-6.5rem)] grid-cols-[minmax(0,1fr)_22rem] gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-emerald-600" />
            <Input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search by name, generic name, or scan barcode"
              className="h-11 rounded-xl border-emerald-200 pl-10 text-sm shadow-sm focus-visible:border-emerald-500"
              aria-label="Search medicines"
              autoComplete="off"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">
              <ScanBarcode className="size-3.5" />
              Scan ready
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Filter by category">
            <CategoryChip label="All" count={catalog?.length ?? 0} active={!category} dim={showResults} onClick={() => chooseCategory("")} />
            {categories.map(([name, count]) => (
              <CategoryChip
                key={name}
                label={name}
                count={count}
                dot={toneFor(name).dot}
                active={category === name}
                dim={showResults}
                onClick={() => chooseCategory(category === name ? "" : name)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-xs">
          <span className="shrink-0 font-medium text-slate-700">
            {showResults
              ? searching || resultsFor !== query.trim()
                ? "Searching..."
                : `${results.length} ${results.length === 1 ? "match" : "matches"} for "${query.trim()}"`
              : catalog
                ? `${category || "All medicines"} · ${browseRows.length}`
                : "Loading medicines..."}
          </span>
          <span className="truncate text-slate-400">Up and Down to move, Enter to add, F2 to search, F9 to check out</span>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3">
          {!showResults && catalog === null ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <PackageSearch className="size-6" />
              </span>
              <p className="text-[13px] text-slate-500">
                {!showResults
                  ? "No medicines in this list yet."
                  : searching || resultsFor !== query.trim()
                    ? "Searching..."
                    : "No sellable medicine matches this search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
              {rows.map((m, i) => {
                const tone = toneFor(m.categoryName);
                const inCart = cartQty.get(m._id) ?? 0;
                const out = m.stock <= 0;
                return (
                  <button
                    key={m._id}
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => addToCart(m)}
                    aria-label={`Add ${m.name}`}
                    className={cn(
                      "group flex flex-col rounded-xl border bg-white p-3 text-left shadow-xs transition-all",
                      i === highlight ? "border-emerald-400 ring-2 ring-emerald-500/30" : "border-slate-200",
                      out ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("flex size-9 items-center justify-center rounded-lg", tone.tile)}>
                        <Pill className="size-4.5" />
                      </span>
                      <div className="flex items-center gap-1">
                        {m.prescriptionRequired && <RxBadge />}
                        {inCart > 0 && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                            {inCart} in cart
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2.5 truncate text-[13px] font-semibold text-slate-900">{m.name}</p>
                    <p className="truncate text-xs text-slate-500">{m.genericName}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {describe(m) || m.categoryName}
                      {m.nearestExpiry ? ` · Exp ${formatDate(m.nearestExpiry)}` : ""}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span className="text-[15px] font-bold text-emerald-700 tabular-nums">{money(m.salePrice)}</span>
                      <StockPill m={m} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4.5" />
            <span className="text-sm font-semibold">Current sale</span>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium tabular-nums">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="shrink-0 border-b border-slate-100 p-3">
            <PosCustomerPicker customer={customer} onChange={setCustomer} />
          </div>

          <div className="min-h-40 flex-[1_0_auto]">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                  <ShoppingBasket className="size-6" />
                </span>
                <p className="text-[13px] font-medium text-slate-700">Cart is empty</p>
                <p className="text-xs text-slate-400">Click a medicine or scan a barcode to add it.</p>
              </div>
            ) : (
              <ul className="space-y-2 p-3">
                {cart.map((line, i) => {
                  const p = priced.lines[i];
                  const tone = toneFor(line.medicine.categoryName);
                  return (
                    <li key={line.medicine._id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", tone.tile)}>
                          <Pill className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-slate-900">
                            {line.medicine.name}
                            {line.medicine.prescriptionRequired && <RxBadge />}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {formatAmount(line.medicine.salePrice)} each
                            {line.medicine.taxPercent > 0 ? ` · tax ${line.medicine.taxPercent}%` : ""}
                          </p>
                        </div>
                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{formatAmount(p.total)}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${line.medicine.name}`}
                          className="-mt-0.5 -mr-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setCart((prev) => prev.filter((l) => l.medicine._id !== line.medicine._id))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 xl:pl-10.5">
                        <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={line.quantity <= 1}
                            onClick={() => setQuantity(line, line.quantity - 1)}
                            className="flex size-6 items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-emerald-700 disabled:opacity-40"
                          >
                            <Minus className="size-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={line.medicine.stock}
                            value={line.quantity}
                            onChange={(e) => setQuantity(line, e.target.valueAsNumber)}
                            className="w-10 bg-transparent text-center text-[13px] font-semibold tabular-nums outline-none"
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={line.quantity >= line.medicine.stock}
                            onClick={() => setQuantity(line, line.quantity + 1)}
                            className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <span className="text-[11px] whitespace-nowrap text-slate-400">of {line.medicine.stock}</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <Label htmlFor={`disc-${line.medicine._id}`} className="text-[11px] font-normal text-slate-500">
                            Discount
                          </Label>
                          <Input
                            id={`disc-${line.medicine._id}`}
                            inputMode="decimal"
                            value={line.discountText}
                            placeholder="0.00"
                            onChange={(e) => updateLine(line.medicine._id, { discountText: e.target.value.replace(/[^\d.]/g, "") })}
                            className={cn("h-7 w-16 text-right tabular-nums", parseAmount(line.discountText) > p.gross && "border-red-500")}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-slate-200 bg-slate-50/80 p-3">
            <PrescriptionPanel
              rxItemNames={rxItems}
              attached={prescription}
              onAttach={setPrescription}
              customerName={customer?.name}
              customerPhone={customer?.phone}
            />

            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatAmount(priced.subtotal)}</dd>
              </div>
              {priced.lineDiscountTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Item discounts</dt>
                  <dd className="font-medium text-rose-600 tabular-nums">-{formatAmount(priced.lineDiscountTotal)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt>
                  <Label htmlFor="bill-discount" className="text-[13px] font-normal text-slate-500">
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
                <dt className="text-slate-500">Tax</dt>
                <dd className="font-medium tabular-nums">{formatAmount(priced.taxTotal)}</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-900 to-teal-900 px-4 py-3 text-white shadow-sm">
              <span className="text-sm font-medium text-emerald-100">Total to pay</span>
              <span className="text-xl font-bold tabular-nums">{money(priced.grandTotal)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => {
                const style = PAYMENT_STYLES[m];
                const Icon = style.icon;
                const selected = paymentMethod === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-white text-[13px] font-semibold transition-all",
                      selected ? style.active : cn("border-slate-200", style.idle)
                    )}
                  >
                    <Icon className="size-4" />
                    {m === "mpesa" ? <span className="font-extrabold tracking-tight">M-PESA</span> : PAYMENT_METHOD_LABELS[m]}
                  </button>
                );
              })}
            </div>

            {paymentMethod === "cash" && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[13px]">
                <Label htmlFor="tendered" className="font-medium text-amber-900">
                  Cash received
                </Label>
                <Input
                  id="tendered"
                  inputMode="decimal"
                  value={tenderedText}
                  placeholder={formatAmount(priced.grandTotal)}
                  onChange={(e) => setTenderedText(e.target.value.replace(/[^\d.]/g, ""))}
                  className="h-8 w-28 border-amber-300 text-right tabular-nums"
                />
                <span
                  className={cn(
                    "w-28 text-right font-semibold tabular-nums",
                    change !== null && change < 0 ? "text-red-600" : "text-emerald-700"
                  )}
                >
                  {change === null ? "" : change < 0 ? `Short ${formatAmount(-change)}` : `Change ${formatAmount(change)}`}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="h-11 px-4" disabled={cart.length === 0 || checkingOut}>
                    Clear
                  </Button>
                }
                title="Clear this sale?"
                description="All items, discounts, the customer and the attached prescription will be removed from the cart."
                confirmLabel="Clear sale"
                destructive
                onConfirm={async () => resetSale()}
              />
              <Button
                className="h-11 flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-[15px] font-semibold shadow-md shadow-emerald-700/25 hover:from-emerald-700 hover:to-teal-700"
                onClick={() => void checkout()}
                disabled={!!blocker || checkingOut}
                title={blocker ?? "F9"}
              >
                {checkingOut ? "Processing..." : `Charge ${money(priced.grandTotal)}`}
              </Button>
            </div>
            {blocker && cart.length > 0 && <p className="text-xs font-medium text-amber-700">{blocker}.</p>}
            {lastSale && (
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                <span>
                  Last sale <span className="font-semibold text-slate-800">{lastSale.invoiceNo}</span>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                  onClick={() => printInvoice(lastSale.id)}
                >
                  <Printer className="size-3.5" />
                  Reprint invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  dot,
  active,
  dim,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  active: boolean;
  dim: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
        dim && "opacity-50"
      )}
    >
      {dot && <span className={cn("size-2 rounded-full", active ? "bg-white" : dot)} />}
      {label}
      <span className={cn("tabular-nums", active ? "text-emerald-100" : "text-slate-400")}>{count}</span>
    </button>
  );
}
