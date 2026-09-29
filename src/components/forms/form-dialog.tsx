"use client";

import { SquarePen, TriangleAlert } from "lucide-react";
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
  const Icon = destructive ? TriangleAlert : SquarePen;
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(wide ? "sm:max-w-2xl" : "sm:max-w-md", destructive && "before:from-red-500 before:via-rose-500 before:to-rose-400")}
      >
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              destructive ? "bg-red-100 text-red-600" : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-700/20"
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </DialogHeader>
        <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <FormError message={error} />
          {children}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending} variant={destructive ? "destructive" : "default"} className="min-w-24">
            {pending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
