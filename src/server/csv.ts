export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return `\uFEFF${[header, ...lines].join("\r\n")}`;
}

export function csvResponse(filename: string, csv: string): Response {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
