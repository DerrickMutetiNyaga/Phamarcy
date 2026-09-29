"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/format";
import {
  ADJUSTMENT_LABELS,
  ADJUSTMENT_TYPES,
  stockAdjustmentSchema,
  type StockAdjustmentInput,
} from "@/lib/validators/stock";

export function DeleteMedicineButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Delete medicine?"
      description={`${name} will be permanently removed. Medicines with stock or sales history cannot be deleted; mark them inactive instead.`}
      onConfirm={async () => {
        await apiFetch(`/api/medicines/${id}`, { method: "DELETE" });
        toast.success("Medicine deleted");
        router.push("/inventory");
        router.refresh();
      }}
      trigger={
        <Button variant="outline" className="text-red-600 hover:text-red-700">
          <Trash2 className="size-4" />
          Delete
        </Button>
      }
    />
  );
}

interface AdjustStockDialogProps {
  batch: { _id: string; batchNo: string; quantity: number; expiryDate: string };
}

export function AdjustStockDialog({ batch }: AdjustStockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const defaults: StockAdjustmentInput = { type: "damage", direction: "decrease", quantity: 1, reason: "" };
  const form = useForm({ resolver: zodResolver(stockAdjustmentSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const [type, direction, quantity] = useWatch({ control: form.control, name: ["type", "direction", "quantity"] });
  const resulting =
    typeof quantity === "number" && !Number.isNaN(quantity)
      ? batch.quantity + (direction === "increase" ? quantity : -quantity)
      : batch.quantity;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    if (values.direction === "decrease" && values.quantity > batch.quantity) {
      form.setError("quantity", { message: `Only ${batch.quantity} in this batch` });
      return;
    }
    try {
      await apiFetch(`/api/batches/${batch._id}/adjust`, { method: "POST", body: values });
      toast.success(`Stock adjusted for batch ${batch.batchNo}`);
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          form.reset();
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Batch {batch.batchNo}, expires {formatDate(batch.expiryDate)}. Current quantity: {batch.quantity}.
          </DialogDescription>
        </DialogHeader>
        <form id="adjust-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={serverError} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required error={errors.type?.message}>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (v !== "correction") form.setValue("direction", "decrease");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {ADJUSTMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ADJUSTMENT_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Direction" error={errors.direction?.message}>
              <Controller
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={type !== "correction"}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="decrease">Remove stock</SelectItem>
                      <SelectItem value="increase">Add stock</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field
            label="Quantity"
            htmlFor="adj-qty"
            required
            error={errors.quantity?.message}
            hint={`Quantity after adjustment: ${resulting}`}
          >
            <Input id="adj-qty" type="number" min="1" step="1" className="text-right" {...form.register("quantity", { valueAsNumber: true })} />
          </Field>
          <Field label="Reason" htmlFor="adj-reason" required error={errors.reason?.message}>
            <Textarea id="adj-reason" rows={3} placeholder="e.g. Strip crushed during delivery" {...form.register("reason")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="adjust-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
