"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

export function EditIconButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Edit" title="Edit" className="text-gray-500 hover:text-gray-900" {...props}>
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
        <Button variant="ghost" size="icon-sm" aria-label="Delete" title="Delete" className="text-gray-500 hover:text-red-600">
          <Trash2 className="size-3.5" />
        </Button>
      }
    />
  );
}
