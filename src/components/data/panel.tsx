import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-md border border-gray-200 bg-white", className)}>{children}</div>;
}

export function PanelHeader({ title, actions, description }: { title: string; actions?: React.ReactNode; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-2.5">
      <div>
        <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Table height is capped so the sticky header stays visible while rows scroll. */
export const TABLE_SCROLL = "max-h-[calc(100vh-13.5rem)]";

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <p className="text-[13px] text-gray-500">{message}</p>
      {action}
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-gray-500">{item.label}</dt>
          <dd className="truncate text-[13px] text-gray-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
