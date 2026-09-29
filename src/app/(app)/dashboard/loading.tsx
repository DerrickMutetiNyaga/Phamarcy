import { TableSkeleton } from "@/components/data/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-24 bg-slate-200/70" />
              <Skeleton className="size-9 rounded-xl bg-emerald-100" />
            </div>
            <Skeleton className="mt-1 h-7 w-20 bg-slate-200" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={6} rows={8} />
    </div>
  );
}
