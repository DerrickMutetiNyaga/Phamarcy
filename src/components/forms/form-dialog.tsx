"use client";

import { useId } from "react";
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
import { cn } from "@/lib/utils";
import { FormError } from "./field";

interface FormDialogProps {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  wide?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}

export function FormDialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  onSubmit,
  submitLabel,
  pending,
  error,
  wide,
  destructive,
  children,
}: FormDialogProps) {
  const formId = useId();
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn(wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={error} />
          {children}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending} variant={destructive ? "destructive" : "default"}>
            {pending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
