import { Types, type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import { formatDate, formatDateTime, formatPercent, round2 } from "@/lib/format";
import {
  EXPIRY_WINDOW_LABELS,
  EXPIRY_WINDOWS,
  PURCHASE_GROUPS,
  SALES_GROUPS,
  type ColumnFormat,
  type ReportColumn,
  type ReportResult,
  type ReportRow,
  type ReportType,
} from "@/lib/report-types";
import { escapeRegex } from "@/lib/serialize";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/validators/sale";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from "@/lib/validators/purchase";
import { Batch, Category, Medicine, Purchase, Sale, Supplier } from "@/models";
import type { CsvColumn } from "../csv";
import { dateMatch, dateRangeParam, oneOf, param, type SearchParams } from "../query";
import { listExpiring } from "./inventory";

const col = (key: string, label: string, format: ColumnFormat = "text"): ReportColumn => ({ key, label, format });

function totalsFor(rows: ReportRow[], columns: ReportColumn[], label: string, skip: string[] = []): ReportRow {
  const totals: ReportRow = {};
  columns.forEach((c, i) => {
    if (i === 0) totals[c.key] = label;
    else if ((c.format === "money" || c.format === "number") && !skip.includes(c.key)) {
      const sum = rows.reduce((s, r) => s + (typeof r[c.key] === "number" ? (r[c.key] as number) : 0), 0);
      totals[c.key] = c.format === "money" ? round2(sum) : sum;
    } else totals[c.key] = null;
  });
  return totals;
}

function saleMatch(sp: SearchParams): Record<string, unknown> {
  const match: Record<string, unknown> = { status: "completed" };
  const created = dateMatch(dateRangeParam(sp));
  if (created) match.createdAt = created;
  const method = oneOf(sp, "paymentMethod", PAYMENT_METHODS);
  if (method) match.paymentMethod = method;
  return match;
}

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function salesReport(sp: SearchParams): Promise<ReportResult> {
  const group = oneOf(sp, "group", SALES_GROUPS) || "invoice";
  const match = saleMatch(sp);
  const description = "Completed sales only. Refunded invoices are excluded.";

  if (group === "invoice") {
    const columns = [
      col("invoiceNo", "Invoice"),
      col("date", "Date", "datetime"),
      col("customer", "Customer"),
      col("payment", "Payment"),
      col("items", "Items", "number"),
      col("subtotal", "Subtotal", "money"),
      col("discount", "Discount", "money"),
      col("tax", "Tax", "money"),
      col("total", "Total", "money"),
    ];
    const sales = await Sale.find(match).sort({ createdAt: -1 }).limit(5000).lean();
    const rows: ReportRow[] = sales.map((s) => ({
      invoiceNo: s.invoiceNo,
      date: new Date(s.createdAt).toISOString(),
      customer: s.customerName,
      payment: PAYMENT_METHOD_LABELS[s.paymentMethod],
      items: s.items.reduce((n, i) => n + i.quantity, 0),
      subtotal: s.subtotal,
      discount: s.discountTotal,
      tax: s.taxTotal,
      total: s.grandTotal,
    }));
    return { title: "Sales by invoice", description, columns, rows, totals: totalsFor(rows, columns, `${rows.length} invoices`) };
  }

  if (group === "day") {
    const columns = [
      col("day", "Date", "date"),
      col("invoices", "Invoices", "number"),
      col("discount", "Discount", "money"),
      col("tax", "Tax", "money"),
      col("total", "Total", "money"),
    ];
    const rows = await Sale.aggregate<ReportRow>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: tz } },
          invoices: { $sum: 1 },
          discount: { $sum: "$discountTotal" },
          tax: { $sum: "$taxTotal" },
          total: { $sum: "$grandTotal" },
        },
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          day: "$_id",
          invoices: 1,
          discount: { $round: ["$discount", 2] },
          tax: { $round: ["$tax", 2] },
          total: { $round: ["$total", 2] },
        },
      },
    ]);
    return { title: "Sales by day", description, columns, rows, totals: totalsFor(rows, columns, "Total") };
  }

  if (group === "medicine") {
    const columns = [
      col("medicine", "Medicine"),
      col("quantity", "Qty sold", "number"),
      col("gross", "Gross", "money"),
      col("discount", "Discount", "money"),
      col("tax", "Tax", "money"),
      col("total", "Net total", "money"),
    ];
    const rows = await Sale.aggregate<ReportRow>([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.medicine",
          medicine: { $first: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          gross: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          discount: { $sum: "$items.discount" },
          tax: { $sum: "$items.tax" },
          total: { $sum: "$items.total" },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          medicine: 1,
          quantity: 1,
          gross: { $round: ["$gross", 2] },
          discount: { $round: ["$discount", 2] },
          tax: { $round: ["$tax", 2] },
          total: { $round: ["$total", 2] },
        },
      },
    ]);
    return { title: "Sales by medicine", description, columns, rows, totals: totalsFor(rows, columns, "Total") };
  }

  if (group === "customer") {
    const columns = [
      col("customer", "Customer"),
      col("phone", "Phone"),
      col("invoices", "Invoices", "number"),
      col("discount", "Discount", "money"),
      col("total", "Total", "money"),
    ];
    const rows = await Sale.aggregate<ReportRow>([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$customer", "walk-in"] },
          customer: { $first: { $cond: [{ $eq: ["$customer", null] }, "Walk-in customers", "$customerName"] } },
          phone: { $first: { $cond: [{ $eq: ["$customer", null] }, "", "$customerPhone"] } },
          invoices: { $sum: 1 },
          discount: { $sum: "$discountTotal" },
          total: { $sum: "$grandTotal" },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          customer: 1,
          phone: 1,
          invoices: 1,
          discount: { $round: ["$discount", 2] },
          total: { $round: ["$total", 2] },
        },
      },
    ]);
    return { title: "Sales by customer", description, columns, rows, totals: totalsFor(rows, columns, "Total") };
  }

  const columns = [
    col("payment", "Payment method"),
    col("invoices", "Invoices", "number"),
    col("discount", "Discount", "money"),
    col("tax", "Tax", "money"),
    col("total", "Total", "money"),
  ];
  const grouped = await Sale.aggregate<{ _id: keyof typeof PAYMENT_METHOD_LABELS; invoices: number; discount: number; tax: number; total: number }>([
    { $match: match },
    {
      $group: {
        _id: "$paymentMethod",
        invoices: { $sum: 1 },
        discount: { $sum: "$discountTotal" },
        tax: { $sum: "$taxTotal" },
        total: { $sum: "$grandTotal" },
      },
    },
    { $sort: { total: -1 } },
  ]);
  const rows: ReportRow[] = grouped.map((g) => ({
    payment: PAYMENT_METHOD_LABELS[g._id] ?? g._id,
    invoices: g.invoices,
    discount: round2(g.discount),
    tax: round2(g.tax),
    total: round2(g.total),
  }));
  return { title: "Sales by payment method", description, columns, rows, totals: totalsFor(rows, columns, "Total") };
}

async function purchaseReport(sp: SearchParams): Promise<ReportResult> {
  const group = oneOf(sp, "group", PURCHASE_GROUPS) || "invoice";
  const match: Record<string, unknown> = {};
  const date = dateMatch(dateRangeParam(sp));
  if (date) match.date = date;
  const status = oneOf(sp, "paymentStatus", PAYMENT_STATUSES);
  if (status) match.paymentStatus = status;
  const supplier = param(sp, "supplier");
  if (supplier && Types.ObjectId.isValid(supplier)) match.supplier = new Types.ObjectId(supplier);
  const description = "Stock received from suppliers, with payment position.";

  if (group === "invoice") {
    const columns = [
      col("purchaseNo", "Purchase"),
      col("date", "Date", "date"),
      col("supplier", "Supplier"),
      col("supplierInvoice", "Supplier invoice"),
      col("status", "Status"),
      col("items", "Lines", "number"),
      col("total", "Total", "money"),
      col("paid", "Paid", "money"),
      col("due", "Due", "money"),
    ];
    const rows = await Purchase.aggregate<ReportRow>([
      { $match: match },
      { $sort: { date: -1 } },
      { $limit: 5000 },
      { $lookup: { from: Supplier.collection.name, localField: "supplier", foreignField: "_id", as: "sup" } },
      {
        $project: {
          _id: 0,
          purchaseNo: 1,
          date: { $dateToString: { date: "$date" } },
          supplier: { $ifNull: [{ $first: "$sup.name" }, ""] },
          supplierInvoice: { $ifNull: ["$supplierInvoiceNo", ""] },
          status: "$paymentStatus",
          items: { $size: "$items" },
          total: 1,
          paid: "$amountPaid",
          due: { $round: [{ $subtract: ["$total", "$amountPaid"] }, 2] },
        },
      },
    ]);
    rows.forEach((r) => {
      r.status = PAYMENT_STATUS_LABELS[r.status as keyof typeof PAYMENT_STATUS_LABELS] ?? r.status;
    });
    return { title: "Purchases", description, columns, rows, totals: totalsFor(rows, columns, `${rows.length} purchases`) };
  }

  const columns = [
    col("supplier", "Supplier"),
    col("purchases", "Purchases", "number"),
    col("total", "Total", "money"),
    col("paid", "Paid", "money"),
    col("due", "Due", "money"),
  ];
  const rows = await Purchase.aggregate<ReportRow>([
    { $match: match },
    { $group: { _id: "$supplier", purchases: { $sum: 1 }, total: { $sum: "$total" }, paid: { $sum: "$amountPaid" } } },
    { $lookup: { from: Supplier.collection.name, localField: "_id", foreignField: "_id", as: "sup" } },
    { $sort: { total: -1 } },
    {
      $project: {
        _id: 0,
        supplier: { $ifNull: [{ $first: "$sup.name" }, "Unknown"] },
        purchases: 1,
        total: { $round: ["$total", 2] },
        paid: { $round: ["$paid", 2] },
        due: { $round: [{ $subtract: ["$total", "$paid"] }, 2] },
      },
    },
  ]);
  return { title: "Purchases by supplier", description, columns, rows, totals: totalsFor(rows, columns, "Total") };
}

async function stockReport(sp: SearchParams): Promise<ReportResult> {
  const now = new Date();
  const match: Record<string, unknown> = { quantity: { $gt: 0 }, expiryDate: { $gt: now } };
  const q = param(sp, "q");
  const category = param(sp, "category");
  const medMatch: Record<string, unknown> = {};
  if (q) medMatch["med.name"] = new RegExp(escapeRegex(q), "i");
  if (category && Types.ObjectId.isValid(category)) medMatch["med.category"] = new Types.ObjectId(category);

  const columns = [
    col("medicine", "Medicine"),
    col("category", "Category"),
    col("batches", "Batches", "number"),
    col("quantity", "Qty in stock", "number"),
    col("costValue", "Cost value", "money"),
    col("retailValue", "Retail value", "money"),
    col("margin", "Potential margin", "money"),
  ];
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $lookup: { from: Medicine.collection.name, localField: "medicine", foreignField: "_id", as: "med" } },
    { $unwind: "$med" },
    ...(Object.keys(medMatch).length ? [{ $match: medMatch }] : []),
    {
      $group: {
        _id: "$medicine",
        medicine: { $first: { $trim: { input: { $concat: ["$med.name", " ", { $ifNull: ["$med.strength", ""] }] } } } },
        categoryId: { $first: "$med.category" },
        batches: { $sum: 1 },
        quantity: { $sum: "$quantity" },
        costValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } },
        salePrice: { $first: "$med.salePrice" },
      },
    },
    { $lookup: { from: Category.collection.name, localField: "categoryId", foreignField: "_id", as: "cat" } },
    { $sort: { medicine: 1 } },
    {
      $project: {
        _id: 0,
        medicine: 1,
        category: { $ifNull: [{ $first: "$cat.name" }, ""] },
        batches: 1,
        quantity: 1,
        costValue: { $round: ["$costValue", 2] },
        retailValue: { $round: [{ $multiply: ["$quantity", "$salePrice"] }, 2] },
        margin: { $round: [{ $subtract: [{ $multiply: ["$quantity", "$salePrice"] }, "$costValue"] }, 2] },
      },
    },
  ];
  const rows = await Batch.aggregate<ReportRow>(pipeline);
  return {
    title: "Stock valuation",
    description: "Sellable stock only (expired batches excluded). Cost uses each batch's purchase price; retail uses the current sale price.",
    columns,
    rows,
    totals: totalsFor(rows, columns, "Total", ["batches"]),
  };
}

async function expiryReport(sp: SearchParams): Promise<ReportResult> {
  const window = oneOf(sp, "window", EXPIRY_WINDOWS) || "30";
  const rows = await listExpiring(window === "expired" ? 0 : Number(window), param(sp, "q"));
  const columns = [
    col("medicine", "Medicine"),
    col("batchNo", "Batch"),
    col("expiryDate", "Expiry", "date"),
    col("daysLeft", "Days left", "number"),
    col("quantity", "Qty", "number"),
    col("unitCost", "Unit cost", "money"),
    col("costValue", "Value at cost", "money"),
  ];
  const reportRows: ReportRow[] = rows.map((r) => ({
    medicine: [r.medicineName, r.strength].filter(Boolean).join(" "),
    batchNo: r.batchNo,
    expiryDate: r.expiryDate,
    daysLeft: r.daysLeft,
    quantity: r.quantity,
    unitCost: r.purchasePrice,
    costValue: r.costValue,
  }));
  return {
    title: `Expiry report: ${EXPIRY_WINDOW_LABELS[window].toLowerCase()}`,
    description: "Batches with stock on hand, earliest expiry first.",
    columns,
    rows: reportRows,
    totals: totalsFor(reportRows, columns, `${reportRows.length} batches`, ["daysLeft", "unitCost"]),
  };
}

async function profitReport(sp: SearchParams): Promise<ReportResult> {
  const match = saleMatch(sp);
  const columns = [
    col("medicine", "Medicine"),
    col("quantity", "Qty sold", "number"),
    col("revenue", "Revenue (ex. tax)", "money"),
    col("cost", "Cost of goods", "money"),
    col("profit", "Gross profit", "money"),
    col("margin", "Margin", "percent"),
  ];
  const rows = await Sale.aggregate<ReportRow>([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.medicine",
        medicine: { $first: "$items.name" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: { $subtract: ["$items.total", "$items.tax"] } },
        cost: { $sum: { $multiply: ["$items.costPrice", "$items.quantity"] } },
      },
    },
    { $sort: { revenue: -1 } },
    {
      $project: {
        _id: 0,
        medicine: 1,
        quantity: 1,
        revenue: { $round: ["$revenue", 2] },
        cost: { $round: ["$cost", 2] },
        profit: { $round: [{ $subtract: ["$revenue", "$cost"] }, 2] },
        margin: {
          $cond: [
            { $gt: ["$revenue", 0] },
            { $round: [{ $multiply: [{ $divide: [{ $subtract: ["$revenue", "$cost"] }, "$revenue"] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
  ]);
  const totals = totalsFor(rows, columns, "Total");
  const revenue = Number(totals.revenue ?? 0);
  totals.margin = revenue > 0 ? round2((Number(totals.profit ?? 0) / revenue) * 100) : 0;
  return {
    title: "Profit estimate",
    description: "Revenue net of discounts and tax, minus the purchase cost of the exact batches sold. Refunds excluded.",
    columns,
    rows,
    totals,
  };
}

export async function runReport(type: ReportType, sp: SearchParams): Promise<ReportResult> {
  await connectDB();
  switch (type) {
    case "sales":
      return salesReport(sp);
    case "purchases":
      return purchaseReport(sp);
    case "stock":
      return stockReport(sp);
    case "expiry":
      return expiryReport(sp);
    case "profit":
      return profitReport(sp);
  }
}

export function reportCsvColumns(report: ReportResult): CsvColumn<ReportRow>[] {
  return report.columns.map((c) => ({
    header: c.label,
    value: (row) => {
      const v = row[c.key];
      if (v === null || v === undefined) return "";
      if (c.format === "date" && typeof v === "string" && v.includes("-")) return formatDate(v);
      if (c.format === "datetime" && typeof v === "string" && v.includes("-")) return formatDateTime(v);
      if (c.format === "percent" && typeof v === "number") return formatPercent(v);
      if (c.format === "money" && typeof v === "number") return v.toFixed(2);
      return v;
    },
  }));
}
