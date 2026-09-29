import { format } from "date-fns";
import { Types } from "mongoose";
import type { z } from "zod";
import { connectDB, withTransaction } from "@/lib/db";
import { formatDate, round2 } from "@/lib/format";
import { escapeRegex } from "@/lib/serialize";
import {
  paymentStatusFor,
  purchaseTotal,
  type PaymentStatus,
  type purchaseSchema,
} from "@/lib/validators/purchase";
import {
  Batch,
  Medicine,
  nextSequence,
  Purchase,
  Supplier,
  type IBatch,
  type IMedicine,
  type IPurchase,
  type IPurchaseItem,
  type ISupplier,
} from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { ApiError } from "../http";
import { dateMatch, PAGE_SIZE, skipFor, type DateRange, type Paginated } from "../query";

type PurchaseData = z.output<typeof purchaseSchema>;

function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export async function createPurchase(data: PurchaseData, user: SessionUser): Promise<{ id: string; purchaseNo: string }> {
  return withTransaction(async (session) => {
    const supplier = await Supplier.findById(data.supplier).session(session).lean<ISupplier>();
    if (!supplier) throw new ApiError(400, "Selected supplier was not found.");

    const medicineIds = [...new Set(data.items.map((i) => i.medicine))];
    const medicines = await Medicine.find({ _id: { $in: medicineIds } }).session(session).lean<IMedicine[]>();
    const byId = new Map(medicines.map((m) => [String(m._id), m]));

    const items: IPurchaseItem[] = [];
    for (const [index, item] of data.items.entries()) {
      const med = byId.get(item.medicine);
      if (!med) throw new ApiError(400, `Line ${index + 1}: medicine not found.`);
      const expiryDate = parseDay(item.expiryDate);

      const existing = await Batch.findOne({ medicine: med._id, batchNo: item.batchNo }).session(session).lean<IBatch>();
      let batchId: Types.ObjectId;
      if (existing) {
        if (format(existing.expiryDate, "yyyy-MM-dd") !== item.expiryDate) {
          throw new ApiError(
            400,
            `Line ${index + 1}: batch ${item.batchNo} of ${med.name} already exists with expiry ${formatDate(existing.expiryDate)}.`
          );
        }
        await Batch.updateOne(
          { _id: existing._id },
          { $inc: { quantity: item.quantity }, $set: { purchasePrice: item.unitCost, supplier: supplier._id } },
          { session }
        );
        batchId = existing._id;
      } else {
        const [created] = await Batch.create(
          [
            {
              medicine: med._id,
              batchNo: item.batchNo,
              expiryDate,
              quantity: item.quantity,
              purchasePrice: item.unitCost,
              supplier: supplier._id,
            },
          ],
          { session }
        );
        batchId = created._id;
      }

      await Medicine.updateOne({ _id: med._id }, { $set: { purchasePrice: item.unitCost } }, { session });

      items.push({
        medicine: med._id,
        name: [med.name, med.strength].filter(Boolean).join(" "),
        batch: batchId,
        batchNo: item.batchNo,
        expiryDate,
        quantity: item.quantity,
        unitCost: round2(item.unitCost),
        lineTotal: round2(item.quantity * item.unitCost),
      });
    }

    const total = purchaseTotal(data.items);
    const amountPaid = round2(data.amountPaid);
    const purchaseNo = await nextSequence("purchase", "PO", session);
    const date = parseDay(data.date);

    const [purchase] = await Purchase.create(
      [
        {
          purchaseNo,
          supplier: supplier._id,
          supplierInvoiceNo: data.supplierInvoiceNo,
          date,
          items,
          total,
          amountPaid,
          paymentStatus: paymentStatusFor(total, amountPaid),
          payments: amountPaid > 0 ? [{ amount: amountPaid, date, note: "Paid at purchase", user: user.id }] : [],
          notes: data.notes,
          createdBy: user.id,
        },
      ],
      { session }
    );

    await logAudit({
      user,
      action: "create",
      entity: "purchase",
      entityId: String(purchase._id),
      meta: { purchaseNo, total, supplier: supplier.name },
      session,
    });

    return { id: String(purchase._id), purchaseNo };
  });
}

export async function recordPurchasePayment(id: string, amount: number, note: string, user: SessionUser): Promise<void> {
  await connectDB();
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new ApiError(404, "Purchase not found.");
  const due = round2(purchase.total - purchase.amountPaid);
  if (due <= 0) throw new ApiError(409, "This purchase is already fully paid.");
  if (round2(amount) > due) throw new ApiError(400, `Amount exceeds the outstanding balance of ${due.toFixed(2)}.`);

  const amountPaid = round2(purchase.amountPaid + amount);
  const res = await Purchase.updateOne(
    { _id: purchase._id, amountPaid: purchase.amountPaid },
    {
      $set: { amountPaid, paymentStatus: paymentStatusFor(purchase.total, amountPaid) },
      $push: { payments: { amount: round2(amount), date: new Date(), note, user: user.id } },
    }
  );
  if (res.modifiedCount !== 1) throw new ApiError(409, "The purchase was updated by someone else. Please reload.");
  await logAudit({ user, action: "payment", entity: "purchase", entityId: id, meta: { purchaseNo: purchase.purchaseNo, amount } });
}

export interface PurchaseRow {
  _id: string;
  purchaseNo: string;
  supplierInvoiceNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  itemCount: number;
  total: number;
  amountPaid: number;
  due: number;
  paymentStatus: PaymentStatus;
}

export interface PurchaseFilters {
  q?: string;
  supplier?: string;
  paymentStatus?: PaymentStatus | "";
  range?: DateRange;
  page?: number;
  pageSize?: number;
}

export interface PurchaseListResult extends Paginated<PurchaseRow> {
  totals: { total: number; amountPaid: number; due: number };
}

export async function listPurchases(filters: PurchaseFilters): Promise<PurchaseListResult> {
  await connectDB();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const match: Record<string, unknown> = {};
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    match.$or = [{ purchaseNo: rx }, { supplierInvoiceNo: rx }];
  }
  if (filters.supplier && Types.ObjectId.isValid(filters.supplier)) match.supplier = new Types.ObjectId(filters.supplier);
  if (filters.paymentStatus) match.paymentStatus = filters.paymentStatus;
  const date = filters.range ? dateMatch(filters.range) : undefined;
  if (date) match.date = date;

  const [result] = await Purchase.aggregate<{
    rows: PurchaseRow[];
    total: { n: number }[];
    sums: { total: number; amountPaid: number }[];
  }>([
    { $match: match },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $facet: {
        rows: [
          { $skip: skipFor(page, pageSize) },
          { $limit: pageSize },
          { $lookup: { from: Supplier.collection.name, localField: "supplier", foreignField: "_id", as: "sup" } },
          {
            $project: {
              _id: { $toString: "$_id" },
              purchaseNo: 1,
              supplierInvoiceNo: { $ifNull: ["$supplierInvoiceNo", ""] },
              date: { $dateToString: { date: "$date" } },
              supplierId: { $toString: "$supplier" },
              supplierName: { $ifNull: [{ $first: "$sup.name" }, ""] },
              itemCount: { $size: "$items" },
              total: 1,
              amountPaid: 1,
              due: { $round: [{ $subtract: ["$total", "$amountPaid"] }, 2] },
              paymentStatus: 1,
            },
          },
        ],
        total: [{ $count: "n" }],
        sums: [{ $group: { _id: null, total: { $sum: "$total" }, amountPaid: { $sum: "$amountPaid" } } }],
      },
    },
  ]);

  const sums = result?.sums[0] ?? { total: 0, amountPaid: 0 };
  return {
    rows: result?.rows ?? [],
    total: result?.total[0]?.n ?? 0,
    page,
    pageSize,
    totals: {
      total: round2(sums.total),
      amountPaid: round2(sums.amountPaid),
      due: round2(sums.total - sums.amountPaid),
    },
  };
}

export type PurchaseDetail = Omit<IPurchase, "supplier" | "createdBy" | "payments"> & {
  supplier: Pick<ISupplier, "_id" | "name" | "phone"> | null;
  createdBy: { _id: Types.ObjectId; name: string } | null;
  payments: { amount: number; date: Date; note?: string; user: { _id: Types.ObjectId; name: string } | null }[];
};

export async function getPurchase(id: string): Promise<PurchaseDetail | null> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) return null;
  return Purchase.findById(id)
    .populate("supplier", "name phone")
    .populate("createdBy", "name")
    .populate("payments.user", "name")
    .lean<PurchaseDetail>();
}
