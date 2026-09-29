"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, FormError } from "@/components/forms/field";
import { PrescriptionUploadDialog } from "@/components/prescription-upload-dialog";
import { DeleteIconButton } from "@/components/row-actions";
import { PrescriptionStatusBadge } from "@/components/status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { prescriptionReviewSchema, type PrescriptionStatus } from "@/lib/validators/prescription";

export function UploadPrescriptionButton({ label = "Upload prescription" }: { label?: string }) {
  return (
    <PrescriptionUploadDialog
      trigger={
        <Button>
          <Upload className="size-4" />
          {label}
        </Button>
      }
    />
  );
}

interface ReviewRow {
  _id: string;
  customerName: string;
  phone: string;
  imageUrl: string;
  notes: string;
  status: PrescriptionStatus;
  reviewNote: string;
  createdAt: string;
  uploadedByName: string;
}

export function ReviewPrescriptionDialog({ row }: { row: ReviewRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(prescriptionReviewSchema),
    defaultValues: { status: "verified" as const, reviewNote: row.reviewNote },
  });
  const { errors, isSubmitting } = form.formState;

  async function submit(status: "verified" | "rejected") {
    form.setValue("status", status);
    await form.handleSubmit(async (values) => {
      setError(null);
      try {
        await apiFetch(`/api/prescriptions/${row._id}`, { method: "PATCH", body: values });
        toast.success(values.status === "verified" ? "Prescription verified" : "Prescription rejected");
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isSubmitting) return;
        setOpen(v);
        if (v) {
          form.reset({ status: "verified", reviewNote: row.reviewNote });
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {row.status === "pending" ? "Review" : "View"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Prescription for {row.customerName}</DialogTitle>
          <DialogDescription>
            {row.phone} · uploaded {formatDateTime(row.createdAt)} by {row.uploadedByName || "unknown"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
          <a
            href={row.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="relative block h-[28rem] overflow-hidden rounded-md border border-gray-200 bg-gray-50"
          >
            <Image src={row.imageUrl} alt="Prescription" fill sizes="600px" className="object-contain" />
          </a>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Current status</span>
              <PrescriptionStatusBadge status={row.status} />
            </div>
            {row.notes && (
              <div>
                <p className="text-xs text-gray-500">Notes from counter</p>
                <p className="text-[13px] text-gray-800">{row.notes}</p>
              </div>
            )}
            <a href={row.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
              <ExternalLink className="size-3" />
              Open full size
            </a>
            <FormError message={error} />
            <Field label="Review note" htmlFor={`note-${row._id}`} error={errors.reviewNote?.message} hint="Required when rejecting.">
              <Textarea id={`note-${row._id}`} rows={4} {...form.register("reviewNote")} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Close
          </Button>
          <Button type="button" variant="destructive" onClick={() => submit("rejected")} disabled={isSubmitting}>
            Reject
          </Button>
          <Button type="button" onClick={() => submit("verified")} disabled={isSubmitting}>
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePrescriptionButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <DeleteIconButton
      title="Delete prescription?"
      description={`The prescription for ${name} and its image will be permanently deleted. Prescriptions attached to a sale cannot be deleted.`}
      onConfirm={async () => {
        await apiFetch(`/api/prescriptions/${id}`, { method: "DELETE" });
        toast.success("Prescription deleted");
        router.refresh();
      }}
    />
  );
}
