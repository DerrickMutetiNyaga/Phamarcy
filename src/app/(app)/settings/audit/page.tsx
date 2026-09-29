import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { dateRangeParam, pageParam, param, type SearchParams } from "@/server/query";
import { AUDIT_ENTITIES, listAuditLogs } from "@/server/services/audit-log";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function AuditTable({ sp }: { sp: SearchParams }) {
  const result = await listAuditLogs({
    q: param(sp, "q"),
    entity: param(sp, "entity"),
    range: dateRangeParam(sp),
    page: pageParam(sp),
  });
  if (result.total === 0) {
    return (
      <Panel>
        <EmptyState message="No activity matches these filters." />
      </Panel>
    );
  }
  return (
    <Panel>
      <Table containerClassName="max-h-[calc(100vh-16rem)]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Time</TableHead>
            <TableHead className="w-40">User</TableHead>
            <TableHead className="w-28">Action</TableHead>
            <TableHead className="w-28">Entity</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r._id}>
              <TableCell className="text-gray-600 tabular-nums">{formatDateTime(r.timestamp)}</TableCell>
              <TableCell>{r.userName}</TableCell>
              <TableCell>{label(r.action.replaceAll("_", " "))}</TableCell>
              <TableCell>{label(r.entity)}</TableCell>
              <TableCell className="max-w-xl truncate text-gray-600" title={r.details}>
                {r.details || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </Panel>
  );
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search user, action or record ID"
        dateRange
        exportHref="/api/audit"
        filters={[
          { key: "entity", placeholder: "All records", width: "w-40", options: AUDIT_ENTITIES.map((e) => ({ value: e, label: label(e) })) },
        ]}
      />
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={5} />}>
        <AuditTable sp={sp} />
      </Suspense>
    </div>
  );
}
