"use client";

import { Search, UserPlus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PartyDialog } from "@/components/party-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client/api";

export interface PosCustomer {
  _id: string;
  name: string;
  phone: string;
}

export function PosCustomerPicker({ customer, onChange }: { customer: PosCustomer | null; onChange: (c: PosCustomer | null) => void }) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "notfound">("idle");
  const [addOpen, setAddOpen] = useState(false);

  async function lookup() {
    const value = phone.trim();
    if (value.replace(/\D/g, "").length < 7) {
      toast.error("Enter at least 7 digits of the phone number");
      return;
    }
    setState("loading");
    try {
      const { customer: found } = await apiFetch<{ customer: PosCustomer | null }>(
        `/api/customers/lookup?phone=${encodeURIComponent(value)}`
      );
      if (found) {
        onChange({ _id: found._id, name: found.name, phone: found.phone });
        setPhone("");
        setState("idle");
      } else setState("notfound");
    } catch (error) {
      toast.error(errorMessage(error));
      setState("idle");
    }
  }

  if (customer) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-semibold text-white">
          {customer.name
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-emerald-950">{customer.name}</p>
          <p className="text-xs text-emerald-700 tabular-nums">{customer.phone}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove customer"
          onClick={() => onChange(null)}
          className="text-emerald-700 hover:bg-emerald-100"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <UserRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="tel"
            value={phone}
            className="h-9 pl-8"
            placeholder="Customer phone (optional)"
            onChange={(e) => {
              setPhone(e.target.value);
              if (state === "notfound") setState("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void lookup();
              }
            }}
            aria-label="Customer phone"
          />
        </div>
        <Button variant="outline" className="h-9" onClick={lookup} disabled={state === "loading"}>
          <Search className="size-4" />
          Find
        </Button>
      </div>
      {state === "notfound" ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">No customer with this phone.</span>
          <button type="button" className="inline-flex items-center gap-1 text-emerald-700 hover:underline" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-3.5" />
            Add customer
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Walk-in sale if no customer is selected.</p>
      )}
      <PartyDialog
        kind="customer"
        open={addOpen}
        onOpenChange={setAddOpen}
        initialPhone={phone}
        onSaved={(c) => {
          onChange({ _id: c._id, name: c.name, phone: c.phone });
          setPhone("");
          setState("idle");
        }}
      />
    </div>
  );
}
