import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm", className)}>{children}</div>;
}

export function PanelHeader({ title, actions, description }: { title: string; actions?: React.ReactNode; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-white px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
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
