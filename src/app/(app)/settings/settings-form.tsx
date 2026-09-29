"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SlidersHorizontal, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Panel, PanelHeader } from "@/components/data/panel";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { settingsSchema, type SettingsInput } from "@/lib/validators/settings";

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await apiFetch<SettingsInput>("/api/settings", { method: "PUT", body: values });
      form.reset(saved);
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
      <FormError message={error} />
      <Panel>
        <PanelHeader title="Pharmacy details" description="Shown in the top bar and printed on every invoice." icon={Store} tone="emerald" />
        <div className="grid grid-cols-2 gap-4 p-4">
          <Field label="Pharmacy name" htmlFor="pharmacyName" required error={errors.pharmacyName?.message} className="col-span-2">
            <Input id="pharmacyName" {...form.register("pharmacyName")} aria-invalid={!!errors.pharmacyName} />
          </Field>
          <Field label="Address" htmlFor="address" error={errors.address?.message} className="col-span-2">
            <Textarea id="address" rows={2} {...form.register("address")} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...form.register("phone")} />
          </Field>
          <Field label="Tax registration no." htmlFor="taxNumber" error={errors.taxNumber?.message}>
            <Input id="taxNumber" {...form.register("taxNumber")} />
          </Field>
          <Field label="Invoice footer" htmlFor="receiptFooter" error={errors.receiptFooter?.message} className="col-span-2" hint="Return policy, thank-you note or pharmacist registration number.">
            <Textarea id="receiptFooter" rows={2} {...form.register("receiptFooter")} />
          </Field>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Defaults" description="Currency and stock settings used across the system." icon={SlidersHorizontal} tone="amber" />
        <div className="grid grid-cols-2 gap-4 p-4">
          <Field label="Currency symbol" htmlFor="currencySymbol" required error={errors.currencySymbol?.message} hint="Used for display and printing only.">
            <Input id="currencySymbol" className="w-24" {...form.register("currencySymbol")} aria-invalid={!!errors.currencySymbol} />
          </Field>
          <Field
            label="Default reorder level"
            htmlFor="lowStockDefault"
            required
            error={errors.lowStockDefault?.message}
            hint="Pre-filled when adding a new medicine."
          >
            <Input
              id="lowStockDefault"
              type="number"
              min={0}
              className="w-32"
              {...form.register("lowStockDefault", { valueAsNumber: true })}
              aria-invalid={!!errors.lowStockDefault}
            />
          </Field>
        </div>
      </Panel>
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl bg-white/90 p-3 shadow-lg ring-1 shadow-emerald-900/10 ring-slate-200 backdrop-blur">
        {isDirty && <p className="mr-auto text-xs font-medium text-amber-700">You have unsaved changes.</p>}
        <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset(initial)}>
          Discard changes
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
