"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { customerSchema, supplierSchema, type CustomerInput } from "@/lib/validators/party";

export interface PartyValues {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface PartyDialogProps {
  kind: "customer" | "supplier";
  party?: PartyValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialPhone?: string;
  onSaved?: (party: PartyValues) => void;
}

const LABELS = { customer: "customer", supplier: "supplier" } as const;

export function PartyDialog({ kind, party, trigger, open: controlledOpen, onOpenChange, initialPhone, onSaved }: PartyDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [error, setError] = useState<string | null>(null);
  const defaults: CustomerInput = {
    name: party?.name ?? "",
    phone: party?.phone ?? initialPhone ?? "",
    email: party?.email ?? "",
    address: party?.address ?? "",
  };
  const form = useForm({
    resolver: zodResolver(kind === "customer" ? customerSchema : supplierSchema),
    defaultValues: defaults,
  });
  const { errors, isSubmitting } = form.formState;
  const endpoint = kind === "customer" ? "/api/customers" : "/api/suppliers";

  function setOpen(value: boolean) {
    if (value) {
      form.reset(defaults);
      setError(null);
    }
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      let saved: PartyValues;
      if (party) {
        await apiFetch(`${endpoint}/${party._id}`, { method: "PATCH", body: values });
        saved = { _id: party._id, ...values, email: values.email ?? "", address: values.address ?? "" };
      } else if (kind === "customer") {
        saved = await apiFetch<PartyValues>(endpoint, { method: "POST", body: values });
      } else {
        const { id } = await apiFetch<{ id: string }>(endpoint, { method: "POST", body: values });
        saved = { _id: id, ...values, email: values.email ?? "", address: values.address ?? "" };
      }
      toast.success(`${kind === "customer" ? "Customer" : "Supplier"} ${party ? "updated" : "added"}`);
      setOpen(false);
      onSaved?.(saved);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={trigger}
      title={party ? `Edit ${LABELS[kind]}` : `Add ${LABELS[kind]}`}
      open={open}
      onOpenChange={setOpen}
      onSubmit={onSubmit}
      submitLabel={party ? "Save changes" : `Add ${LABELS[kind]}`}
      pending={isSubmitting}
      error={error}
    >
      <Field label="Name" htmlFor={`${kind}-name`} required error={errors.name?.message}>
        <Input id={`${kind}-name`} autoFocus {...form.register("name")} aria-invalid={!!errors.name} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor={`${kind}-phone`} required error={errors.phone?.message}>
          <Input id={`${kind}-phone`} type="tel" {...form.register("phone")} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Email" htmlFor={`${kind}-email`} error={errors.email?.message}>
          <Input id={`${kind}-email`} type="email" {...form.register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <Field label="Address" htmlFor={`${kind}-address`} error={errors.address?.message}>
        <Textarea id={`${kind}-address`} rows={2} {...form.register("address")} />
      </Field>
    </FormDialog>
  );
}
