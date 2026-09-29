"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ScanBarcode, Trash2 } from "lucide-react";
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
        <PanelHeader title="Purchase details" />
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
          actions={
            <div className="relative w-64">
              <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400" />
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
                  <TableCell className="pt-3.5 text-right text-gray-400 tabular-nums">{i + 1}</TableCell>
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
                    {med && <p className="mt-1 text-xs text-gray-500">Unit: {UNIT_LABELS[med.unit]}</p>}
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
                  <TableCell className="pt-3.5 text-right font-medium tabular-nums">{money(lineTotal(i))}</TableCell>
                  <TableCell className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove line"
                      className="text-gray-400 hover:text-red-600"
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
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5">
          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
            <Plus className="size-3.5" />
            Add line
          </Button>
          {typeof itemErrors?.message === "string" && <p className="text-xs text-red-600">{itemErrors.message}</p>}
          {typeof itemErrors?.root?.message === "string" && <p className="text-xs text-red-600">{itemErrors.root.message}</p>}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Panel className="w-full max-w-sm">
          <dl className="space-y-2 px-4 py-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-gray-500">Lines</dt>
              <dd className="tabular-nums">{fields.length}</dd>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <dt className="text-gray-500">
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
              <dt className="text-gray-500">Balance due</dt>
              <dd className="flex items-center gap-2 tabular-nums">
                <PaymentStatusBadge status={paymentStatusFor(total, paid)} />
                {money(round2(Math.max(0, total - paid)))}
              </dd>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-xs text-emerald-700 hover:underline"
                onClick={() => form.setValue("amountPaid", total, { shouldValidate: true })}
              >
                Mark as fully paid
              </button>
            </div>
          </dl>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
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
