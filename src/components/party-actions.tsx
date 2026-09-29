"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeleteIconButton, EditIconButton } from "@/components/row-actions";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import { PartyDialog, type PartyValues } from "./party-dialog";

type Kind = "customer" | "supplier";

export function AddPartyButton({ kind, label }: { kind: Kind; label?: string }) {
  return (
    <PartyDialog
      kind={kind}
      trigger={
        <Button>
          <Plus className="size-4" />
          {label ?? (kind === "customer" ? "Add customer" : "Add supplier")}
        </Button>
      }
    />
  );
}

export function PartyRowActions({ kind, party, redirectTo }: { kind: Kind; party: PartyValues; redirectTo?: string }) {
  const router = useRouter();
  const endpoint = kind === "customer" ? "/api/customers" : "/api/suppliers";
  const noun = kind === "customer" ? "customer" : "supplier";
  const history = kind === "customer" ? "sales" : "purchase";
  return (
    <div className="flex justify-end gap-1">
      <PartyDialog kind={kind} party={party} trigger={<EditIconButton />} />
      <DeleteIconButton
        title={`Delete ${noun}?`}
        description={`${party.name} will be permanently removed. A ${noun} with ${history} history cannot be deleted.`}
        onConfirm={async () => {
          await apiFetch(`${endpoint}/${party._id}`, { method: "DELETE" });
          toast.success(`${kind === "customer" ? "Customer" : "Supplier"} deleted`);
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        }}
      />
    </div>
  );
}
