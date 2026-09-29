"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Printer, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { printInvoice } from "@/lib/client/print";
import { refundSchema } from "@/lib/validators/sale";

export function ReprintButton({ saleId }: { saleId: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => printInvoice(saleId)}>
      <Printer className="size-4" />
      Print invoice
    </Button>
  );
}

export function RefundDialog({ saleId, invoiceNo, total }: { saleId: string; invoiceNo: string; total: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(refundSchema), defaultValues: { reason: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch(`/api/sales/${saleId}/refund`, { method: "POST", body: values });
      toast.success(`${invoiceNo} refunded and stock restored`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Undo2 className="size-4" />
          Refund
        </Button>
      }
      title={`Refund ${invoiceNo}?`}
      description={`The full amount of ${total} will be refunded and every item returned to its original batch. This cannot be undone.`}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset({ reason: "" });
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel="Refund sale"
      pending={isSubmitting}
      error={error}
      destructive
    >
      <Field label="Reason" htmlFor="refund-reason" required error={errors.reason?.message}>
        <Textarea id="refund-reason" rows={3} autoFocus placeholder="e.g. Wrong medicine dispensed" {...form.register("reason")} />
      </Field>
    </FormDialog>
  );
}
