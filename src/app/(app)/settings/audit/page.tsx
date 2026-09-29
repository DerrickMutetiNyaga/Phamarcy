import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { InitialsAvatar } from "@/components/initials-avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { dateRangeParam, pageParam, param, type SearchParams } from "@/server/query";
import { AUDIT_ENTITIES, listAuditLogs } from "@/server/services/audit-log";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function actionVariant(action: string): React.ComponentProps<typeof Badge>["variant"] {
  if (/delete|refund|deactivate|reject/.test(action)) return "danger";
  if (/create|add|verify|activate|payment/.test(action)) return "success";
  if (/update|edit|adjust|review/.test(action)) return "info";
  if (/login|logout|sign/.test(action)) return "rx";
  return "outline";
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
              <TableCell className="text-slate-600 tabular-nums">{formatDateTime(r.timestamp)}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                  <InitialsAvatar name={r.userName || "?"} className="size-6 text-[9px]" />
                  {r.userName}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={actionVariant(r.action)}>{label(r.action.replaceAll("_", " "))}</Badge>
              </TableCell>
              <TableCell>
                <span className="text-[13px] font-medium text-slate-700">{label(r.entity)}</span>
              </TableCell>
              <TableCell className="max-w-xl truncate text-slate-600" title={r.details}>
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
