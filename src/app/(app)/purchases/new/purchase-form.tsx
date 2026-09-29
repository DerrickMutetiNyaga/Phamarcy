"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, PackagePlus, Plus, ScanBarcode, Trash2, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Panel, PanelHeader } from "@/components/data/panel";
import { Field, FormError } from "@/components/forms/field";
import { MedicineCombobox } from "@/components/medicine-combobox";
import { useMoney } from "@/components/providers/app-context";
import { PaymentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { round2 } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UNIT_LABELS } from "@/lib/validators/medicine";
import { paymentStatusFor, purchaseSchema, type PurchaseInput } from "@/lib/validators/purchase";
import type { MedicineOption } from "@/server/services/inventory";

interface PurchaseFormProps {
  suppliers: { value: string; label: string }[];
  medicines: MedicineOption[];
  defaults: PurchaseInput;
}

const emptyLine = { medicine: "", batchNo: "", expiryDate: "", quantity: 1, unitCost: 0 };

export function PurchaseForm({ suppliers, medicines, defaults }: PurchaseFormProps) {
  const router = useRouter();
  const money = useMoney();
  const [serverError, setServerError] = useState<string | null>(null);
  const [scan, setScan] = useState("");
  const form = useForm({ resolver: zodResolver(purchaseSchema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { errors, isSubmitting } = form.formState;
  const [items, amountPaid] = useWatch({ control: form.control, name: ["items", "amountPaid"] });
  const byId = new Map(medicines.map((m) => [m.value, m]));
  const options = medicines.map((m) => ({ value: m.value, label: m.label, hint: [m.genericName, m.barcode].filter(Boolean).join(" · ") }));

  const lineTotal = (i: number) => {
    const line = items[i];
    const qty = Number(line?.quantity);
    const cost = Number(line?.unitCost);
    return Number.isFinite(qty) && Number.isFinite(cost) ? round2(qty * cost) : 0;
  };
  const total = round2(items.reduce((s, _, i) => s + lineTotal(i), 0));
  const paid = Number.isFinite(amountPaid) ? Number(amountPaid) : 0;

  function selectMedicine(index: number, id: string) {
    form.setValue(`items.${index}.medicine`, id, { shouldValidate: true });
    const med = byId.get(id);
    const currentCost = form.getValues(`items.${index}.unitCost`);
    if (med && (!currentCost || currentCost === 0)) form.setValue(`items.${index}.unitCost`, med.purchasePrice);
  }

  function addScanned() {
    const code = scan.trim();
    if (!code) return;
    const med = medicines.find((m) => m.barcode && m.barcode.toLowerCase() === code.toLowerCase());
    if (!med) {
      toast.error(`No active medicine with barcode ${code}`);
      return;
    }
    const current = form.getValues("items");
    const blankIndex = current.findIndex((l) => !l.medicine);
    const index = blankIndex >= 0 ? blankIndex : current.length;
    if (blankIndex < 0) append({ ...emptyLine, medicine: med.value, unitCost: med.purchasePrice });
    else selectMedicine(blankIndex, med.value);
    setScan("");
    setTimeout(() => document.getElementById(`batch-${index}`)?.focus(), 0);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { id, purchaseNo } = await apiFetch<{ id: string; purchaseNo: string }>("/api/purchases", {
        method: "POST",
        body: values,
      });
      toast.success(`Purchase ${purchaseNo} saved and stock updated`);
      router.push(`/purchases/${id}`);
      router.refresh();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const itemErrors = errors.items;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={serverError} />
      <Panel>
        <PanelHeader title="Purchase details" description="Who delivered the stock and when." icon={Truck} tone="sky" />
        <div className="grid gap-4 p-4 md:grid-cols-4">
          <Field label="Supplier" required error={errors.supplier?.message}>
            <Controller
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.supplier}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {suppliers.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Supplier invoice no." htmlFor="supplierInvoiceNo" error={errors.supplierInvoiceNo?.message}>
            <Input id="supplierInvoiceNo" {...form.register("supplierInvoiceNo")} />
          </Field>
          <Field label="Purchase date" htmlFor="date" required error={errors.date?.message}>
            <Input id="date" type="date" {...form.register("date")} aria-invalid={!!errors.date} />
          </Field>
          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={1} className="min-h-8" {...form.register("notes")} />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Items"
          description="Each line creates a new batch, or adds to an existing batch with the same number and expiry."
          icon={PackagePlus}
          tone="teal"
          actions={
            <div className="relative w-64">
              <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-teal-600" />
              <Input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addScanned();
                  }
                }}
                placeholder="Scan barcode to add line"
                className="pl-8 font-mono"
                aria-label="Scan barcode"
              />
            </div>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead className="min-w-64">Medicine</TableHead>
              <TableHead className="w-36">Batch no.</TableHead>
              <TableHead className="w-40">Expiry</TableHead>
              <TableHead className="w-28 text-right">Qty</TableHead>
              <TableHead className="w-32 text-right">Unit cost</TableHead>
              <TableHead className="w-32 text-right">Line total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((f, i) => {
              const e = itemErrors?.[i];
              const med = byId.get(items[i]?.medicine ?? "");
              return (
                <TableRow key={f.id} className="align-top hover:bg-transparent">
                  <TableCell className="pt-3 text-right">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 tabular-nums">
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Controller
                      control={form.control}
                      name={`items.${i}.medicine`}
                      render={({ field }) => (
                        <MedicineCombobox
                          options={options}
                          value={field.value}
                          onChange={(v) => selectMedicine(i, v)}
                          invalid={!!e?.medicine}
                        />
                      )}
                    />
                    {med && (
                      <p className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
                        Unit: {UNIT_LABELS[med.unit]}
                      </p>
                    )}
                    {e?.medicine && <p className="mt-1 text-xs text-red-600">{e.medicine.message}</p>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input id={`batch-${i}`} className="font-mono uppercase" {...form.register(`items.${i}.batchNo`)} aria-invalid={!!e?.batchNo} />
                    {e?.batchNo && <p className="mt-1 text-xs text-red-600">{e.batchNo.message}</p>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input type="date" {...form.register(`items.${i}.expiryDate`)} aria-invalid={!!e?.expiryDate} />
                    {e?.expiryDate && <p className="mt-1 text-xs text-red-600">{e.expiryDate.message}</p>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="text-right"
                      {...form.register(`items.${i}.quantity`, { valueAsNumber: true })}
                      aria-invalid={!!e?.quantity}
                    />
                    {e?.quantity && <p className="mt-1 text-xs text-red-600">{e.quantity.message}</p>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="text-right"
                      {...form.register(`items.${i}.unitCost`, { valueAsNumber: true })}
                      aria-invalid={!!e?.unitCost}
                    />
                    {e?.unitCost && <p className="mt-1 text-xs text-red-600">{e.unitCost.message}</p>}
                  </TableCell>
                  <TableCell className="pt-3.5 text-right font-semibold text-slate-900 tabular-nums">{money(lineTotal(i))}</TableCell>
                  <TableCell className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove line"
                      className="bg-rose-50 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 hover:text-rose-700"
                      disabled={fields.length === 1}
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-teal-100 bg-teal-50/40 px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed border-teal-300 text-teal-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
            onClick={() => append({ ...emptyLine })}
          >
            <Plus className="size-3.5" />
            Add line
          </Button>
          {typeof itemErrors?.message === "string" && <p className="text-xs text-red-600">{itemErrors.message}</p>}
          {typeof itemErrors?.root?.message === "string" && <p className="text-xs text-red-600">{itemErrors.root.message}</p>}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Panel className="w-full max-w-sm">
          <PanelHeader title="Payment summary" icon={Wallet} tone="emerald" />
          <dl className="space-y-2.5 px-4 py-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-slate-500">Lines</dt>
              <dd className="font-medium tabular-nums">{fields.length}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-900 to-emerald-950 px-3 py-2.5 text-white">
              <dt className="text-xs font-medium text-emerald-200/90">Purchase total</dt>
              <dd className="text-lg font-bold tabular-nums">{money(total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <dt className="text-slate-600">
                <label htmlFor="amountPaid">Amount paid now</label>
              </dt>
              <dd className="w-36">
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  className={cn("text-right", errors.amountPaid && "border-red-600")}
                  {...form.register("amountPaid", { valueAsNumber: true })}
                />
              </dd>
            </div>
            {errors.amountPaid && <p className="text-right text-xs text-red-600">{errors.amountPaid.message}</p>}
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Balance due</dt>
              <dd className={cn("flex items-center gap-2 font-semibold tabular-nums", total - paid > 0 ? "text-rose-600" : "text-emerald-700")}>
                <PaymentStatusBadge status={paymentStatusFor(total, paid)} />
                {money(round2(Math.max(0, total - paid)))}
              </dd>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                onClick={() => form.setValue("amountPaid", total, { shouldValidate: true })}
              >
                <CircleCheck className="size-3.5" />
                Mark as fully paid
              </button>
            </div>
          </dl>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/purchases">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save purchase"}
            </Button>
          </div>
        </Panel>
      </div>
    </form>
  );
}
