export type ColumnFormat = "text" | "money" | "number" | "date" | "datetime" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  format: ColumnFormat;
}

export type ReportValue = string | number | null;
export type ReportRow = Record<string, ReportValue>;

export interface ReportResult {
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: ReportRow | null;
}

export const REPORT_TYPES = ["sales", "purchases", "stock", "expiry", "profit"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  sales: "Sales",
  purchases: "Purchases",
  stock: "Stock valuation",
  expiry: "Expiry",
  profit: "Profit estimate",
};

export const SALES_GROUPS = ["invoice", "day", "medicine", "customer", "payment"] as const;
export type SalesGroup = (typeof SALES_GROUPS)[number];
export const SALES_GROUP_LABELS: Record<SalesGroup, string> = {
  invoice: "By invoice",
  day: "By day",
  medicine: "By medicine",
  customer: "By customer",
  payment: "By payment method",
};

export const PURCHASE_GROUPS = ["invoice", "supplier"] as const;
export type PurchaseGroup = (typeof PURCHASE_GROUPS)[number];
export const PURCHASE_GROUP_LABELS: Record<PurchaseGroup, string> = {
  invoice: "By purchase",
  supplier: "By supplier",
};

export const EXPIRY_WINDOWS = ["30", "60", "90", "expired"] as const;
export type ExpiryWindow = (typeof EXPIRY_WINDOWS)[number];
export const EXPIRY_WINDOW_LABELS: Record<ExpiryWindow, string> = {
  "30": "Next 30 days",
  "60": "Next 60 days",
  "90": "Next 90 days",
  expired: "Already expired",
};

export function isNumericFormat(format: ColumnFormat): boolean {
  return format === "money" || format === "number" || format === "percent";
}
