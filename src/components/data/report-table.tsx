import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import { isNumericFormat, type ReportColumn, type ReportResult, type ReportValue } from "@/lib/report-types";
import { cn } from "@/lib/utils";
import { EmptyState, Panel, PanelHeader, TABLE_SCROLL } from "./panel";

function renderValue(value: ReportValue, column: ReportColumn, symbol: string): string {
  if (value === null || value === undefined || value === "") return "";
  switch (column.format) {
    case "money":
      return typeof value === "number" ? formatMoney(value, symbol) : String(value);
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
    case "percent":
      return typeof value === "number" ? formatPercent(value) : String(value);
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value) : String(value);
    case "datetime":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDateTime(value) : String(value);
    default:
      return String(value);
  }
}

export function ReportTable({ report, currencySymbol }: { report: ReportResult; currencySymbol: string }) {
  return (
    <Panel>
      <PanelHeader title={report.title} description={report.description} />
      {report.rows.length === 0 ? (
        <EmptyState message="No data for the selected filters." />
      ) : (
        <Table containerClassName={TABLE_SCROLL}>
          <TableHeader>
            <TableRow>
              {report.columns.map((c) => (
                <TableHead key={c.key} className={cn(isNumericFormat(c.format) && "text-right")}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row, i) => (
              <TableRow key={i}>
                {report.columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      isNumericFormat(c.format) && "text-right tabular-nums",
                      typeof row[c.key] === "number" && (row[c.key] as number) < 0 && "text-red-600"
                    )}
                  >
                    {renderValue(row[c.key], c, currencySymbol)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {report.totals && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                {report.columns.map((c) => (
                  <TableCell key={c.key} className={cn(isNumericFormat(c.format) && "text-right tabular-nums")}>
                    {renderValue(report.totals?.[c.key] ?? null, c, currencySymbol)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </Panel>
  );
}
