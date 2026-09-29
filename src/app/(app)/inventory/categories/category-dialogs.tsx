"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { DeleteIconButton, EditIconButton } from "@/components/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { categorySchema, type CategoryInput } from "@/lib/validators/party";

interface CategoryDialogProps {
  category?: { _id: string; name: string; description: string };
  trigger: React.ReactNode;
}

export function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults: CategoryInput = { name: category?.name ?? "", description: category?.description ?? "" };
  const form = useForm({ resolver: zodResolver(categorySchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (category) await apiFetch(`/api/categories/${category._id}`, { method: "PATCH", body: values });
      else await apiFetch("/api/categories", { method: "POST", body: values });
      toast.success(category ? "Category updated" : "Category added");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={trigger}
      title={category ? "Edit category" : "Add category"}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset(defaults);
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel={category ? "Save changes" : "Add category"}
      pending={isSubmitting}
      error={error}
    >
      <Field label="Name" htmlFor="cat-name" required error={errors.name?.message}>
        <Input id="cat-name" autoFocus {...form.register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Description" htmlFor="cat-desc" error={errors.description?.message}>
        <Textarea id="cat-desc" rows={3} {...form.register("description")} />
      </Field>
    </FormDialog>
  );
}

export function AddCategoryButton({ label = "Add category" }: { label?: string }) {
  return (
    <CategoryDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          {label}
        </Button>
      }
    />
  );
}

export function CategoryRowActions({ category }: { category: { _id: string; name: string; description: string } }) {
  const router = useRouter();
  return (
    <div className="flex justify-end gap-1">
      <CategoryDialog category={category} trigger={<EditIconButton />} />
      <DeleteIconButton
        title="Delete category?"
        description={`"${category.name}" will be removed. Categories that are used by medicines cannot be deleted.`}
        onConfirm={async () => {
          await apiFetch(`/api/categories/${category._id}`, { method: "DELETE" });
          toast.success("Category deleted");
          router.refresh();
        }}
      />
    </div>
  );
}
