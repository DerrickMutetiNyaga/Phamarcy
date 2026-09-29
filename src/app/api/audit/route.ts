import { ADMIN_ONLY } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok } from "@/server/http";
import { dateRangeParam, EXPORT_LIMIT, isCsv, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { listAuditLogs } from "@/server/services/audit-log";

export const GET = apiRoute(ADMIN_ONLY, async ({ req }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listAuditLogs({
    q: param(sp, "q"),
    entity: param(sp, "entity"),
    range: dateRangeParam(sp),
    page: csv ? 1 : pageParam(sp),
    pageSize: csv ? EXPORT_LIMIT : undefined,
  });
  if (!csv) return ok(result);
  return csvResponse(
    "audit-log",
    toCsv(result.rows, [
      { header: "Time", value: (r) => formatDateTime(r.timestamp) },
      { header: "User", value: (r) => r.userName },
      { header: "Action", value: (r) => r.action },
      { header: "Entity", value: (r) => r.entity },
      { header: "Entity ID", value: (r) => r.entityId },
      { header: "Details", value: (r) => r.details },
    ])
  );
});
