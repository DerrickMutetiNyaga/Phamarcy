import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { REPORT_TYPES, type ReportType } from "@/lib/report-types";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ApiError, ok } from "@/server/http";
import { isCsv, searchParamsFromRequest } from "@/server/query";
import { reportCsvColumns, runReport } from "@/server/services/reports";

export const GET = apiRoute<{ type: string }>(INVENTORY_ROLES, async ({ req, params }) => {
  if (!(REPORT_TYPES as readonly string[]).includes(params.type)) throw new ApiError(404, "Unknown report.");
  const type = params.type as ReportType;
  const sp = searchParamsFromRequest(req.url);
  const report = await runReport(type, sp);
  if (!isCsv(sp)) return ok(report);
  const rows = report.totals ? [...report.rows, report.totals] : report.rows;
  return csvResponse(`${type}-report`, toCsv(rows, reportCsvColumns(report)));
});
