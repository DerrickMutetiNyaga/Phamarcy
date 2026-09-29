"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

export function EditIconButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Edit"
      title="Edit"
      className="bg-sky-50 text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100 hover:text-sky-800"
      {...props}
    >
      <Pencil className="size-3.5" />
    </Button>
  );
}

export function DeleteIconButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      title={title}
      description={description}
      onConfirm={onConfirm}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          title="Delete"
          className="bg-rose-50 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 hover:text-rose-700"
        >
          <Trash2 className="size-3.5" />
        </Button>
      }
    />
  );
}
