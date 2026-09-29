import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className={inverted ? "fill-white" : "fill-emerald-600"} />
      <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" className={inverted ? "fill-emerald-600" : "fill-white"} />
    </svg>
  );
}
