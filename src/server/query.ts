import { endOfDay, startOfDay } from "date-fns";

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 25;
export const EXPORT_LIMIT = 10_000;

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function param(sp: SearchParams, key: string): string {
  const value = sp[key];
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim();
}

export function oneOf<T extends string>(sp: SearchParams, key: string, allowed: readonly T[]): T | "" {
  const value = param(sp, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function pageParam(sp: SearchParams): number {
  const page = Number.parseInt(param(sp, "page"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseDay(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export function dateRangeParam(sp: SearchParams): DateRange {
  const from = parseDay(param(sp, "from"));
  const to = parseDay(param(sp, "to"));
  return { from: from ? startOfDay(from) : undefined, to: to ? endOfDay(to) : undefined };
}

export function dateMatch(range: DateRange): { $gte?: Date; $lte?: Date } | undefined {
  if (!range.from && !range.to) return undefined;
  return { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) };
}

export function searchParamsFromRequest(url: string): SearchParams {
  const sp: SearchParams = {};
  new URL(url).searchParams.forEach((value, key) => {
    sp[key] = value;
  });
  return sp;
}

export function isCsv(sp: SearchParams): boolean {
  return param(sp, "format") === "csv";
}

export function skipFor(page: number, pageSize = PAGE_SIZE): number {
  return (page - 1) * pageSize;
}
