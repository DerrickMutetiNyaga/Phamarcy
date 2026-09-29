import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "./panel";

export function TableSkeleton({ columns = 6, rows = 10, bare }: { columns?: number; rows?: number; bare?: boolean }) {
  const table = (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columns }, (_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-3 w-16 bg-emerald-200/60" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r} className="hover:bg-transparent">
              {Array.from({ length: columns }, (_, c) => (
                <TableCell key={c}>
                  <Skeleton className={c === 0 ? "h-3.5 w-40 bg-slate-100" : "h-3.5 w-20 bg-slate-100"} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
  return bare ? table : <Panel>{table}</Panel>;
}

export function PageSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/80">
        <Skeleton className="h-8 w-64 bg-slate-100" />
        <Skeleton className="h-8 w-40 bg-slate-100" />
      </div>
      <TableSkeleton columns={columns} />
    </div>
  );
}
