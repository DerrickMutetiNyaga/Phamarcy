"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { useMoney } from "@/components/providers/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { purchasePaymentSchema } from "@/lib/validators/purchase";

export function RecordPaymentDialog({ purchaseId, due }: { purchaseId: string; due: number }) {
  const router = useRouter();
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(purchasePaymentSchema), defaultValues: { amount: due, note: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.amount > due) {
      form.setError("amount", { message: `Cannot exceed the balance of ${money(due)}` });
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/purchases/${purchaseId}/payments`, { method: "POST", body: values });
      toast.success("Payment recorded");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={<Button>Record payment</Button>}
      title="Record supplier payment"
      description={`Outstanding balance: ${money(due)}`}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset({ amount: due, note: "" });
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel="Record payment"
      pending={isSubmitting}
      error={error}
    >
      <Field label="Amount" htmlFor="pay-amount" required error={errors.amount?.message}>
        <Input id="pay-amount" type="number" min="0" step="0.01" className="text-right" {...form.register("amount", { valueAsNumber: true })} />
      </Field>
      <Field label="Note" htmlFor="pay-note" error={errors.note?.message} hint="e.g. cheque number or bank reference">
        <Input id="pay-note" {...form.register("note")} />
      </Field>
    </FormDialog>
  );
}
