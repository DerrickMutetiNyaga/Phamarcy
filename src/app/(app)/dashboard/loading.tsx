import { TableSkeleton } from "@/components/data/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-md border border-gray-200 bg-white px-4 py-3">
            <Skeleton className="h-3 w-24 bg-gray-100" />
            <Skeleton className="mt-2 h-6 w-16 bg-gray-200" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={6} rows={8} />
    </div>
  );
}
