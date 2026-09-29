"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { EditIconButton } from "@/components/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/auth/roles";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators/auth";

export interface UserValues {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

const ROLE_HINTS: Record<Role, string> = {
  admin: "Full access including users and settings.",
  pharmacist: "Inventory, purchases, prescriptions and reports.",
  cashier: "Point of sale, customers and their own sales.",
};

function RoleSelect({ value, onChange, invalid }: { value: Role; onChange: (r: Role) => void; invalid: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger id="user-role" className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent position="popper">
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AddUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults = { name: "", email: "", role: "cashier" as Role, password: "" };
  const form = useForm({ resolver: zodResolver(userCreateSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/users", { method: "POST", body: values });
      toast.success(`${values.name} can now sign in`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={
        <Button>
          <UserPlus className="size-4" />
          Add user
        </Button>
      }
      title="Add user"
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset(defaults);
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel="Add user"
      pending={isSubmitting}
      error={error}
    >
      <Field label="Full name" htmlFor="user-name" required error={errors.name?.message}>
        <Input id="user-name" autoFocus {...form.register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" htmlFor="user-email" required error={errors.email?.message}>
        <Input id="user-email" type="email" autoComplete="off" {...form.register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Role" htmlFor="user-role" required error={errors.role?.message} hint={ROLE_HINTS[role]}>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} invalid={!!errors.role} />}
        />
      </Field>
      <Field label="Temporary password" htmlFor="user-password" required error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
        <Input id="user-password" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={!!errors.password} />
      </Field>
    </FormDialog>
  );
}

export function EditUserButton({ user, isSelf }: { user: UserValues; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults = { name: user.name, email: user.email, role: user.role, isActive: user.isActive, password: "" };
  const form = useForm({ resolver: zodResolver(userUpdateSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch(`/api/users/${user._id}`, { method: "PATCH", body: values });
      toast.success("User updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <FormDialog
      trigger={<EditIconButton />}
      title={`Edit ${user.name}`}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset(defaults);
          setError(null);
        }
      }}
      onSubmit={onSubmit}
      submitLabel="Save changes"
      pending={isSubmitting}
      error={error}
    >
      <Field label="Full name" htmlFor="user-name" required error={errors.name?.message}>
        <Input id="user-name" {...form.register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" htmlFor="user-email" required error={errors.email?.message}>
        <Input id="user-email" type="email" {...form.register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field
        label="Role"
        htmlFor="user-role"
        required
        error={errors.role?.message}
        hint={isSelf ? "You cannot change your own role." : ROLE_HINTS[role]}
      >
        <Controller
          control={form.control}
          name="role"
          render={({ field }) =>
            isSelf ? (
              <Input id="user-role" value={ROLE_LABELS[field.value]} disabled readOnly />
            ) : (
              <RoleSelect value={field.value} onChange={field.onChange} invalid={!!errors.role} />
            )
          }
        />
      </Field>
      <Field
        label="Reset password"
        htmlFor="user-password"
        error={errors.password?.message}
        hint="Leave blank to keep the current password."
      >
        <Input id="user-password" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={!!errors.password} />
      </Field>
    </FormDialog>
  );
}

export function ToggleActiveButton({ user, isSelf }: { user: UserValues; isSelf: boolean }) {
  const router = useRouter();
  if (isSelf) return null;
  const next = !user.isActive;
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className={next ? "text-emerald-700" : "text-red-600 hover:text-red-700"}>
          {next ? "Activate" : "Deactivate"}
        </Button>
      }
      title={next ? `Activate ${user.name}?` : `Deactivate ${user.name}?`}
      description={
        next
          ? "They will be able to sign in again with their existing password."
          : "They will be signed out immediately and will not be able to sign in. Their sales and history are kept."
      }
      confirmLabel={next ? "Activate" : "Deactivate"}
      destructive={!next}
      onConfirm={async () => {
        await apiFetch(`/api/users/${user._id}`, {
          method: "PATCH",
          body: { name: user.name, email: user.email, role: user.role, isActive: next, password: "" },
        });
        toast.success(next ? `${user.name} activated` : `${user.name} deactivated`);
        router.refresh();
      }}
    />
  );
}
