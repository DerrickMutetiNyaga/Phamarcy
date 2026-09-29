import { addDays } from "date-fns";
import { Types, type PipelineStage } from "mongoose";
import { connectDB, withTransaction } from "@/lib/db";
import { escapeRegex } from "@/lib/serialize";
import type { MedicineData, MedicineUnit } from "@/lib/validators/medicine";
import type { AdjustmentType } from "@/lib/validators/stock";
import {
  Batch,
  Category,
  Medicine,
  Sale,
  StockAdjustment,
  type IBatch,
  type ICategory,
  type IMedicine,
  type IStockAdjustment,
} from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { deleteImage } from "../cloudinary";
import { ApiError } from "../http";
import { PAGE_SIZE, skipFor, type Paginated } from "../query";

export const STOCK_FILTERS = ["low", "out", "in"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export interface MedicineRow {
  _id: string;
  name: string;
  genericName: string;
  brand: string;
  strength: string;
  unit: MedicineUnit;
  barcode: string;
  manufacturer: string;
  category: string;
  categoryName: string;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  prescriptionRequired: boolean;
  reorderLevel: number;
  imageUrl: string;
  isActive: boolean;
  stock: number;
  batchCount: number;
  nearestExpiry: string | null;
}

export interface MedicineFilters {
  q?: string;
  category?: string;
  stock?: StockFilter | "";
  status?: "active" | "inactive" | "";
  page?: number;
  pageSize?: number;
}

function stockPipeline(): PipelineStage[] {
  const now = new Date();
  return [
    {
      $lookup: {
        from: Batch.collection.name,
        let: { medicineId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$medicine", "$$medicineId"] },
              quantity: { $gt: 0 },
              expiryDate: { $gt: now },
            },
          },
          {
            $group: {
              _id: null,
              stock: { $sum: "$quantity" },
              batchCount: { $sum: 1 },
              nearestExpiry: { $min: "$expiryDate" },
            },
          },
        ],
        as: "stockInfo",
      },
    },
    {
      $lookup: { from: Category.collection.name, localField: "category", foreignField: "_id", as: "categoryDoc" },
    },
    {
      $addFields: {
        stock: { $ifNull: [{ $first: "$stockInfo.stock" }, 0] },
        batchCount: { $ifNull: [{ $first: "$stockInfo.batchCount" }, 0] },
        nearestExpiry: { $ifNull: [{ $first: "$stockInfo.nearestExpiry" }, null] },
        categoryName: { $ifNull: [{ $first: "$categoryDoc.name" }, ""] },
      },
    },
  ];
}

function stockFilterStage(filter: StockFilter | "" | undefined): PipelineStage[] {
  if (filter === "out") return [{ $match: { stock: 0 } }];
  if (filter === "low") return [{ $match: { $expr: { $lte: ["$stock", "$reorderLevel"] } } }];
  if (filter === "in") return [{ $match: { $expr: { $gt: ["$stock", "$reorderLevel"] } } }];
  return [];
}

const rowProjection: PipelineStage.Project = {
  $project: {
    _id: { $toString: "$_id" },
    name: 1,
    genericName: 1,
    brand: { $ifNull: ["$brand", ""] },
    strength: { $ifNull: ["$strength", ""] },
    unit: 1,
    barcode: { $ifNull: ["$barcode", ""] },
    manufacturer: { $ifNull: ["$manufacturer", ""] },
    category: { $toString: "$category" },
    categoryName: 1,
    salePrice: 1,
    purchasePrice: 1,
    taxPercent: 1,
    prescriptionRequired: 1,
    reorderLevel: 1,
    imageUrl: { $ifNull: ["$imageUrl", ""] },
    isActive: 1,
    stock: 1,
    batchCount: 1,
    nearestExpiry: { $cond: [{ $eq: ["$nearestExpiry", null] }, null, { $dateToString: { date: "$nearestExpiry" } }] },
  },
};

function searchMatch(q: string): Record<string, unknown> {
  const rx = new RegExp(escapeRegex(q), "i");
  return { $or: [{ name: rx }, { genericName: rx }, { brand: rx }, { barcode: q }] };
}

export async function listMedicines(filters: MedicineFilters): Promise<Paginated<MedicineRow>> {
  await connectDB();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const match: Record<string, unknown> = {};
  if (filters.q) Object.assign(match, searchMatch(filters.q));
  if (filters.category && Types.ObjectId.isValid(filters.category)) match.category = new Types.ObjectId(filters.category);
  if (filters.status === "active") match.isActive = true;
  if (filters.status === "inactive") match.isActive = false;

  const [result] = await Medicine.aggregate<{ rows: MedicineRow[]; total: { n: number }[] }>([
    { $match: match },
    ...stockPipeline(),
    ...stockFilterStage(filters.stock),
    { $sort: { name: 1, _id: 1 } },
    {
      $facet: {
        rows: [{ $skip: skipFor(page, pageSize) }, { $limit: pageSize }, rowProjection],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0, page, pageSize };
}

export async function countLowStock(): Promise<number> {
  await connectDB();
  const [result] = await Medicine.aggregate<{ n: number }>([
    { $match: { isActive: true } },
    ...stockPipeline(),
    ...stockFilterStage("low"),
    { $count: "n" },
  ]);
  return result?.n ?? 0;
}

export interface PosMedicine {
  _id: string;
  name: string;
  genericName: string;
  brand: string;
  strength: string;
  unit: MedicineUnit;
  barcode: string;
  salePrice: number;
  taxPercent: number;
  prescriptionRequired: boolean;
  categoryName: string;
  reorderLevel: number;
  stock: number;
  nearestExpiry: string | null;
}

export const POS_CATALOG_LIMIT = 200;

export async function searchSellable(q: string, limit = 20): Promise<PosMedicine[]> {
  await connectDB();
  const rows = await Medicine.aggregate<MedicineRow & { exact: number }>([
    { $match: { isActive: true, ...(q ? searchMatch(q) : {}) } },
    { $addFields: { exact: { $cond: [{ $eq: ["$barcode", q] }, 0, 1] } } },
    { $sort: { exact: 1, name: 1 } },
    { $limit: limit },
    ...stockPipeline(),
    rowProjection,
  ]);
  return rows.map((r) => ({
    _id: r._id,
    name: r.name,
    genericName: r.genericName,
    brand: r.brand,
    strength: r.strength,
    unit: r.unit,
    barcode: r.barcode,
    salePrice: r.salePrice,
    taxPercent: r.taxPercent,
    prescriptionRequired: r.prescriptionRequired,
    categoryName: r.categoryName,
    reorderLevel: r.reorderLevel,
    stock: r.stock,
    nearestExpiry: r.nearestExpiry,
  }));
}

export interface AdjustmentRow {
  _id: Types.ObjectId;
  batchNo: string;
  type: AdjustmentType;
  change: number;
  reason: string;
  createdAt: Date;
  userName: string;
}

export interface MedicineDetail {
  medicine: IMedicine & { categoryName: string };
  batches: IBatch[];
  adjustments: AdjustmentRow[];
  sellableStock: number;
}

export async function getMedicineDetail(id: string): Promise<MedicineDetail | null> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) return null;
  const medicine = await Medicine.findById(id).lean<IMedicine>();
  if (!medicine) return null;
  const [category, batches, adjustments] = await Promise.all([
    Category.findById(medicine.category).lean<ICategory>(),
    Batch.find({ medicine: medicine._id }).sort({ expiryDate: 1 }).lean<IBatch[]>(),
    StockAdjustment.find({ medicine: medicine._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate<{ user: { name: string } | null }>("user", "name")
      .lean<(Omit<IStockAdjustment, "user"> & { user: { name: string } | null })[]>(),
  ]);
  const now = Date.now();
  const sellableStock = batches
    .filter((b) => b.quantity > 0 && new Date(b.expiryDate).getTime() > now)
    .reduce((s, b) => s + b.quantity, 0);
  return {
    medicine: { ...medicine, categoryName: category?.name ?? "" },
    batches,
    adjustments: adjustments.map((a) => ({
      _id: a._id,
      batchNo: a.batchNo,
      type: a.type,
      change: a.change,
      reason: a.reason,
      createdAt: a.createdAt,
      userName: a.user?.name ?? "",
    })),
    sellableStock,
  };
}

async function assertCategory(id: string): Promise<void> {
  const exists = await Category.exists({ _id: id });
  if (!exists) throw new ApiError(400, "Selected category does not exist.");
}

function medicineDoc(data: MedicineData) {
  return { ...data, barcode: data.barcode || undefined };
}

export async function createMedicine(data: MedicineData, user: SessionUser): Promise<string> {
  await connectDB();
  await assertCategory(data.category);
  const doc = await Medicine.create(medicineDoc(data));
  await logAudit({ user, action: "create", entity: "medicine", entityId: String(doc._id), meta: { name: data.name } });
  return String(doc._id);
}

export async function updateMedicine(id: string, data: MedicineData, user: SessionUser): Promise<void> {
  await connectDB();
  await assertCategory(data.category);
  const existing = await Medicine.findById(id).lean<IMedicine>();
  if (!existing) throw new ApiError(404, "Medicine not found.");
  const update: Record<string, unknown> = { ...medicineDoc(data) };
  const unset: Record<string, 1> = {};
  if (!data.barcode) {
    delete update.barcode;
    unset.barcode = 1;
  }
  await Medicine.updateOne({ _id: id }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { runValidators: true });
  if (existing.imagePublicId && existing.imagePublicId !== data.imagePublicId) await deleteImage(existing.imagePublicId);
  await logAudit({ user, action: "update", entity: "medicine", entityId: id, meta: { name: data.name } });
}

export async function deleteMedicine(id: string, user: SessionUser): Promise<void> {
  await connectDB();
  const medicine = await Medicine.findById(id).lean<IMedicine>();
  if (!medicine) throw new ApiError(404, "Medicine not found.");
  const [hasBatches, hasSales] = await Promise.all([
    Batch.exists({ medicine: medicine._id }),
    Sale.exists({ "items.medicine": medicine._id }),
  ]);
  if (hasBatches || hasSales) {
    throw new ApiError(409, "This medicine has stock or sales history. Mark it inactive instead of deleting it.");
  }
  await Medicine.deleteOne({ _id: medicine._id });
  await deleteImage(medicine.imagePublicId);
  await logAudit({ user, action: "delete", entity: "medicine", entityId: id, meta: { name: medicine.name } });
}

export interface AdjustmentData {
  type: AdjustmentType;
  direction: "decrease" | "increase";
  quantity: number;
  reason: string;
}

export async function adjustBatchStock(batchId: string, data: AdjustmentData, user: SessionUser): Promise<void> {
  const change = data.direction === "increase" ? data.quantity : -data.quantity;
  await withTransaction(async (session) => {
    const batch = await Batch.findById(batchId).session(session).lean<IBatch>();
    if (!batch) throw new ApiError(404, "Batch not found.");
    if (batch.quantity + change < 0) {
      throw new ApiError(400, `Cannot remove ${data.quantity}; batch ${batch.batchNo} only has ${batch.quantity} in stock.`);
    }
    const res = await Batch.updateOne(
      { _id: batch._id, quantity: { $gte: change < 0 ? -change : 0 } },
      { $inc: { quantity: change } },
      { session }
    );
    if (res.modifiedCount !== 1) throw new ApiError(409, "Stock changed while saving. Please try again.");
    await StockAdjustment.create(
      [
        {
          medicine: batch.medicine,
          batch: batch._id,
          batchNo: batch.batchNo,
          type: data.type,
          change,
          reason: data.reason,
          user: user.id,
        },
      ],
      { session }
    );
    await logAudit({
      user,
      action: "adjust_stock",
      entity: "batch",
      entityId: batchId,
      meta: { batchNo: batch.batchNo, type: data.type, change, reason: data.reason },
      session,
    });
  });
}

export interface ExpiryRow {
  _id: string;
  medicineId: string;
  medicineName: string;
  strength: string;
  batchNo: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  purchasePrice: number;
  costValue: number;
}

/** days = 0 lists only already-expired batches that still hold stock. */
export async function listExpiring(days: number, q = ""): Promise<ExpiryRow[]> {
  await connectDB();
  const now = new Date();
  const expiryMatch = days === 0 ? { $lte: now } : { $gt: now, $lte: addDays(now, days) };
  const medicineFilter: PipelineStage[] = q
    ? [{ $match: { $or: [{ "med.name": new RegExp(escapeRegex(q), "i") }, { batchNo: new RegExp(escapeRegex(q), "i") }] } }]
    : [];
  return Batch.aggregate<ExpiryRow>([
    { $match: { quantity: { $gt: 0 }, expiryDate: expiryMatch } },
    { $lookup: { from: Medicine.collection.name, localField: "medicine", foreignField: "_id", as: "med" } },
    { $unwind: "$med" },
    ...medicineFilter,
    { $sort: { expiryDate: 1 } },
    {
      $project: {
        _id: { $toString: "$_id" },
        medicineId: { $toString: "$medicine" },
        medicineName: "$med.name",
        strength: { $ifNull: ["$med.strength", ""] },
        batchNo: 1,
        expiryDate: { $dateToString: { date: "$expiryDate" } },
        daysLeft: { $ceil: { $divide: [{ $subtract: ["$expiryDate", now] }, 86_400_000] } },
        quantity: 1,
        purchasePrice: 1,
        costValue: { $round: [{ $multiply: ["$quantity", "$purchasePrice"] }, 2] },
      },
    },
  ]);
}

export async function countExpiringWithin(days: number): Promise<number> {
  await connectDB();
  const now = new Date();
  return Batch.countDocuments({ quantity: { $gt: 0 }, expiryDate: { $gt: now, $lte: addDays(now, days) } });
}

export async function listCategoriesWithCounts(): Promise<(ICategory & { medicineCount: number })[]> {
  await connectDB();
  return Category.aggregate([
    { $lookup: { from: Medicine.collection.name, localField: "_id", foreignField: "category", as: "meds" } },
    { $addFields: { medicineCount: { $size: "$meds" } } },
    { $project: { meds: 0 } },
    { $sort: { name: 1 } },
  ]);
}

export async function listCategoryOptions(): Promise<{ value: string; label: string }[]> {
  await connectDB();
  const cats = await Category.find().sort({ name: 1 }).lean<ICategory[]>();
  return cats.map((c) => ({ value: String(c._id), label: c.name }));
}

export interface MedicineOption {
  value: string;
  label: string;
  genericName: string;
  barcode: string;
  purchasePrice: number;
  unit: MedicineUnit;
}

export async function listMedicineOptions(): Promise<MedicineOption[]> {
  await connectDB();
  const meds = await Medicine.find({ isActive: true }).sort({ name: 1 }).lean<IMedicine[]>();
  return meds.map((m) => ({
    value: String(m._id),
    label: [m.name, m.strength].filter(Boolean).join(" "),
    genericName: m.genericName,
    barcode: m.barcode ?? "",
    purchasePrice: m.purchasePrice,
    unit: m.unit,
  }));
}
