"use client";

import { ChevronsUpDown, Pill } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

interface MedicineComboboxProps {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
}

export function MedicineCombobox({ options, value, onChange, placeholder = "Select medicine", invalid, id }: MedicineComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn("w-full justify-between font-normal", selected ? "text-slate-900" : "text-slate-400")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Pill className={cn("size-3.5 shrink-0", selected ? "text-emerald-600" : "text-slate-300")} />
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search medicine..." />
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={`${o.label} ${o.hint ?? ""} ${o.value}`}
                data-checked={o.value === value}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{o.label}</p>
                  {o.hint && <p className="truncate text-xs text-slate-500">{o.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
