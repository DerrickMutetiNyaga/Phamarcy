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
import { prescriptionCreateSchema, validateImageFile } from "@/lib/validators/prescription";

interface PrescriptionUploadDialogProps {
  trigger: React.ReactNode;
  initialName?: string;
  initialPhone?: string;
  onUploaded?: () => void;
}

export function PrescriptionUploadDialog({ trigger, initialName, initialPhone, onUploaded }: PrescriptionUploadDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaults = { customerName: initialName ?? "", phone: initialPhone ?? "", notes: "" };
  const form = useForm({ resolver: zodResolver(prescriptionCreateSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(
    async (values) => {
      const problem = validateImageFile(file);
      if (problem || !file) {
        setFileError(problem ?? "Choose an image to upload");
        return;
      }
      setError(null);
      try {
        const body = new FormData();
        body.append("customerName", values.customerName);
        body.append("phone", values.phone);
        body.append("notes", values.notes);
        body.append("file", file);
        await apiFetch("/api/prescriptions", { method: "POST", formData: body });
        toast.success("Prescription uploaded. A pharmacist must verify it before it can be used.");
        setOpen(false);
        onUploaded?.();
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    () => {
      if (!file) setFileError("Choose an image to upload");
    }
  );

  return (
    <FormDialog
      trigger={trigger}
      title="Upload prescription"
      description="Photograph or scan the doctor's prescription. It will be queued for pharmacist review."
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset(defaults);
          setFile(null);
          setFileError(null);
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel="Upload"
      pending={isSubmitting}
      error={error}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Patient name" htmlFor="rx-name" required error={errors.customerName?.message}>
          <Input id="rx-name" autoFocus {...form.register("customerName")} aria-invalid={!!errors.customerName} />
        </Field>
        <Field label="Phone" htmlFor="rx-phone" required error={errors.phone?.message}>
          <Input id="rx-phone" type="tel" {...form.register("phone")} aria-invalid={!!errors.phone} />
        </Field>
      </div>
      <Field label="Prescription image" htmlFor="rx-file" required error={fileError ?? undefined} hint="JPG, PNG or WEBP, up to 5 MB.">
        <Input
          id="rx-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="h-auto py-1.5"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setFileError(f ? validateImageFile(f) : null);
          }}
        />
      </Field>
      <Field label="Notes" htmlFor="rx-notes" error={errors.notes?.message}>
        <Textarea id="rx-notes" rows={2} placeholder="Doctor, date on prescription, medicines requested" {...form.register("notes")} />
      </Field>
    </FormDialog>
  );
}
