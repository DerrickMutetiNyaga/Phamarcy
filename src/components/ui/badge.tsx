import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 text-[11px] font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-100 text-slate-700",
        success: "border-emerald-200 bg-emerald-100/70 text-emerald-800",
        warning: "border-amber-200 bg-amber-100/70 text-amber-800",
        danger: "border-red-200 bg-red-100/70 text-red-700",
        info: "border-sky-200 bg-sky-100/70 text-sky-800",
        rx: "border-violet-200 bg-violet-100/70 text-violet-700",
        outline: "border-slate-300 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
