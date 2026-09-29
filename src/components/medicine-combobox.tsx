"use client";

import { ChevronsUpDown } from "lucide-react";
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
          className={cn("w-full justify-between font-normal", !selected && "text-gray-400")}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-3.5 text-gray-400" />
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
                  <p className="truncate text-[13px]">{o.label}</p>
                  {o.hint && <p className="truncate text-xs text-gray-500">{o.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
