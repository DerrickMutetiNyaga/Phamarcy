"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, ImageIcon, Loader2, Pill, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Panel, PanelHeader } from "@/components/data/panel";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { thumbnailUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { MEDICINE_UNITS, medicineSchema, UNIT_LABELS, type MedicineInput } from "@/lib/validators/medicine";
import { validateImageFile } from "@/lib/validators/prescription";

interface MedicineFormProps {
  medicineId?: string;
  defaults: MedicineInput;
  categories: { value: string; label: string }[];
}

export function MedicineForm({ medicineId, defaults, categories }: MedicineFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(medicineSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const [imageUrl, salePrice, purchasePrice] = useWatch({
    control: form.control,
    name: ["imageUrl", "salePrice", "purchasePrice"],
  });
  const margin =
    typeof salePrice === "number" && typeof purchasePrice === "number" && salePrice > 0
      ? ((salePrice - purchasePrice) / salePrice) * 100
      : null;

  async function uploadImage(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const image = await apiFetch<{ url: string; publicId: string }>("/api/uploads", { method: "POST", formData: body });
      form.setValue("imageUrl", image.url, { shouldDirty: true });
      form.setValue("imagePublicId", image.publicId, { shouldDirty: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (medicineId) {
        await apiFetch(`/api/medicines/${medicineId}`, { method: "PATCH", body: values });
        toast.success("Medicine updated");
        router.push(`/inventory/${medicineId}`);
      } else {
        const { id } = await apiFetch<{ id: string }>("/api/medicines", { method: "POST", body: values });
        toast.success("Medicine added");
        router.push(`/inventory/${id}`);
      }
      router.refresh();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const num = { valueAsNumber: true } as const;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-4xl space-y-4">
      <FormError message={serverError} />

      <Panel>
        <PanelHeader title="Identification" description="How the medicine appears at the counter and on invoices." icon={Pill} tone="sky" />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" autoFocus {...form.register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Generic name" htmlFor="genericName" required error={errors.genericName?.message}>
            <Input id="genericName" {...form.register("genericName")} aria-invalid={!!errors.genericName} />
          </Field>
          <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
            <Input id="brand" {...form.register("brand")} />
          </Field>
          <Field label="Manufacturer" htmlFor="manufacturer" error={errors.manufacturer?.message}>
            <Input id="manufacturer" {...form.register("manufacturer")} />
          </Field>
          <Field label="Category" required error={errors.category?.message}>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Unit" required error={errors.unit?.message}>
              <Controller
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {MEDICINE_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Strength" htmlFor="strength" error={errors.strength?.message}>
              <Input id="strength" placeholder="e.g. 500 mg" {...form.register("strength")} />
            </Field>
          </div>
          <Field
            label="Barcode / SKU"
            htmlFor="barcode"
            error={errors.barcode?.message}
            hint="Click here and scan the pack, or type the code."
          >
            <Input
              id="barcode"
              className="font-mono"
              autoComplete="off"
              {...form.register("barcode")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("purchasePrice")?.focus();
                }
              }}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Pricing" description="Prices are per unit and exclude tax." icon={Wallet} tone="emerald" />
        <div className="grid gap-4 p-4 md:grid-cols-4">
          <Field label="Purchase price" htmlFor="purchasePrice" required error={errors.purchasePrice?.message}>
            <Input id="purchasePrice" type="number" step="0.01" min="0" className="text-right" {...form.register("purchasePrice", num)} />
          </Field>
          <Field label="Sale price" htmlFor="salePrice" required error={errors.salePrice?.message}>
            <Input id="salePrice" type="number" step="0.01" min="0" className="text-right" {...form.register("salePrice", num)} />
          </Field>
          <Field label="Tax %" htmlFor="taxPercent" required error={errors.taxPercent?.message}>
            <Input id="taxPercent" type="number" step="0.01" min="0" max="100" className="text-right" {...form.register("taxPercent", num)} />
          </Field>
          <Field label="Margin">
            <p
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums",
                margin === null || Number.isNaN(margin)
                  ? "bg-slate-100 text-slate-400"
                  : margin < 0
                    ? "bg-red-100 text-red-700"
                    : margin < 15
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
              )}
            >
              {margin === null || Number.isNaN(margin) ? "-" : `${margin.toFixed(1)}%`}
            </p>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Stock control" description="Low stock alerts and where the medicine can be sold." icon={Boxes} tone="amber" />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <Field label="Reorder level" htmlFor="reorderLevel" required error={errors.reorderLevel?.message} hint="Flagged as low stock at or below this quantity.">
            <Input id="reorderLevel" type="number" step="1" min="0" className="text-right" {...form.register("reorderLevel", num)} />
          </Field>
          <Controller
            control={form.control}
            name="prescriptionRequired"
            render={({ field }) => (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors md:mt-5",
                  field.value ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <span>
                  <span className="block font-semibold">Prescription required</span>
                  <span className="text-xs opacity-75">The POS asks for a verified prescription.</span>
                </span>
              </label>
            )}
          />
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors md:mt-5",
                  field.value ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <span>
                  <span className="block font-semibold">Active</span>
                  <span className="text-xs opacity-75">Shown and sellable at the POS.</span>
                </span>
              </label>
            )}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Image" description="Optional product photo." icon={ImageIcon} tone="violet" />
        <div className="flex items-center gap-4 p-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/60">
            {imageUrl ? (
              <Image src={thumbnailUrl(imageUrl, 160)} alt="Medicine" width={80} height={80} className="size-20 object-cover" />
            ) : (
              <ImageIcon className="size-6 text-violet-300" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading && <Loader2 className="size-4 animate-spin" />}
              {imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  form.setValue("imageUrl", "", { shouldDirty: true });
                  form.setValue("imagePublicId", "", { shouldDirty: true });
                }}
              >
                <X className="size-4" />
                Remove
              </Button>
            )}
            <span className="text-xs text-slate-500">JPG, PNG or WEBP, up to 5 MB.</span>
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl bg-white/90 p-3 shadow-lg ring-1 shadow-emerald-900/10 ring-slate-200 backdrop-blur">
        <Button type="button" variant="outline" asChild>
          <Link href={medicineId ? `/inventory/${medicineId}` : "/inventory"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Saving..." : medicineId ? "Save changes" : "Add medicine"}
        </Button>
      </div>
    </form>
  );
}
