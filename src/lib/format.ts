import { format } from "date-fns";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const DEFAULT_CURRENCY = "Ksh";

export function formatMoney(value: number, symbol = DEFAULT_CURRENCY): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = /[A-Za-z]$/.test(symbol) ? `${symbol} ` : symbol;
  return `${value < 0 ? "-" : ""}${prefix}${abs}`;
}

export function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return format(new Date(value), "dd MMM yyyy, HH:mm");
}

export function toDateInputValue(value: Date | string): string {
  return format(new Date(value), "yyyy-MM-dd");
}

/** Whole days until the given date; zero or negative once it has passed. */
export function daysUntil(value: Date | string): number {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export function formatPercent(value: number): string {
  return `${round2(value).toFixed(2)}%`;
}
