import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PANEL_TONES = {
  emerald: { icon: "bg-emerald-100 text-emerald-700", wash: "from-emerald-50/80" },
  sky: { icon: "bg-sky-100 text-sky-700", wash: "from-sky-50/80" },
  amber: { icon: "bg-amber-100 text-amber-700", wash: "from-amber-50/80" },
  violet: { icon: "bg-violet-100 text-violet-700", wash: "from-violet-50/80" },
  rose: { icon: "bg-rose-100 text-rose-700", wash: "from-rose-50/80" },
  teal: { icon: "bg-teal-100 text-teal-700", wash: "from-teal-50/80" },
  indigo: { icon: "bg-indigo-100 text-indigo-700", wash: "from-indigo-50/80" },
} as const;

export type PanelTone = keyof typeof PANEL_TONES;

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  actions,
  description,
  icon: Icon,
  tone = "emerald",
}: {
  title: string;
  actions?: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  tone?: PanelTone;
}) {
  const t = PANEL_TONES[tone];
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r via-white to-white px-4 py-3", t.wash)}>
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", t.icon)}>
            <Icon className="size-4" />
          </span>
        ) : (
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
        )}
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/** Table height is capped so the sticky header stays visible while rows scroll. */
export const TABLE_SCROLL = "max-h-[calc(100vh-15rem)]";

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
        <Inbox className="size-5" />
      </span>
      <p className="text-[13px] text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg bg-slate-50/80 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{item.label}</dt>
          <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
