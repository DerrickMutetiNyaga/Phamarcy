import { Types } from "mongoose";
import type { z } from "zod";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/serialize";
import type { categorySchema, customerSchema, supplierSchema } from "@/lib/validators/party";
import {
  Category,
  Customer,
  Medicine,
  Purchase,
  Sale,
  Supplier,
  type ICategory,
  type ICustomer,
  type ISupplier,
} from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { ApiError } from "../http";
import { PAGE_SIZE, skipFor, type Paginated } from "../query";

type CustomerData = z.output<typeof customerSchema>;
type SupplierData = z.output<typeof supplierSchema>;
type CategoryData = z.output<typeof categorySchema>;

/* Customers */

export interface CustomerRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
}

export async function listCustomers(q: string, page = 1, pageSize = PAGE_SIZE): Promise<Paginated<CustomerRow>> {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    match.$or = [{ name: rx }, { phone: new RegExp(escapeRegex(q.replace(/[^\d+]/g, "") || q)) }, { email: rx }];
  }
  const [result] = await Customer.aggregate<{ rows: CustomerRow[]; total: { n: number }[] }>([
    { $match: match },
    { $sort: { name: 1 } },
    {
      $facet: {
        rows: [
          { $skip: skipFor(page, pageSize) },
          { $limit: pageSize },
          {
            $lookup: {
              from: Sale.collection.name,
              let: { cid: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$customer", "$$cid"] }, status: "completed" } },
                { $group: { _id: null, visits: { $sum: 1 }, total: { $sum: "$grandTotal" }, last: { $max: "$createdAt" } } },
              ],
              as: "stats",
            },
          },
          {
            $project: {
              _id: { $toString: "$_id" },
              name: 1,
              phone: 1,
              email: { $ifNull: ["$email", ""] },
              address: { $ifNull: ["$address", ""] },
              createdAt: { $dateToString: { date: "$createdAt" } },
              visits: { $ifNull: [{ $first: "$stats.visits" }, 0] },
              totalSpent: { $round: [{ $ifNull: [{ $first: "$stats.total" }, 0] }, 2] },
              lastVisit: {
                $cond: [
                  { $gt: [{ $size: "$stats" }, 0] },
                  { $dateToString: { date: { $first: "$stats.last" } } },
                  null,
                ],
              },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0, page, pageSize };
}

export async function findCustomerByPhone(phone: string): Promise<ICustomer | null> {
  await connectDB();
  return Customer.findOne({ phone }).lean<ICustomer>();
}

export async function getCustomer(id: string): Promise<ICustomer | null> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) return null;
  return Customer.findById(id).lean<ICustomer>();
}

export async function createCustomer(data: CustomerData, user: SessionUser): Promise<ICustomer> {
  await connectDB();
  const doc = await Customer.create(data);
  await logAudit({ user, action: "create", entity: "customer", entityId: String(doc._id), meta: { name: data.name } });
  return doc.toObject();
}

export async function updateCustomer(id: string, data: CustomerData, user: SessionUser): Promise<void> {
  await connectDB();
  const res = await Customer.updateOne({ _id: id }, { $set: data }, { runValidators: true });
  if (res.matchedCount === 0) throw new ApiError(404, "Customer not found.");
  await logAudit({ user, action: "update", entity: "customer", entityId: id, meta: { name: data.name } });
}

export async function deleteCustomer(id: string, user: SessionUser): Promise<void> {
  await connectDB();
  const customer = await Customer.findById(id).lean<ICustomer>();
  if (!customer) throw new ApiError(404, "Customer not found.");
  if (await Sale.exists({ customer: customer._id })) {
    throw new ApiError(409, "This customer has sales history and cannot be deleted.");
  }
  await Customer.deleteOne({ _id: customer._id });
  await logAudit({ user, action: "delete", entity: "customer", entityId: id, meta: { name: customer.name } });
}

/* Suppliers */

export interface SupplierRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  purchaseCount: number;
  totalPurchased: number;
  totalDue: number;
}

export async function listSuppliers(q: string, page = 1, pageSize = PAGE_SIZE): Promise<Paginated<SupplierRow>> {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    match.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }
  const [result] = await Supplier.aggregate<{ rows: SupplierRow[]; total: { n: number }[] }>([
    { $match: match },
    { $sort: { name: 1 } },
    {
      $facet: {
        rows: [
          { $skip: skipFor(page, pageSize) },
          { $limit: pageSize },
          {
            $lookup: {
              from: Purchase.collection.name,
              let: { sid: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$supplier", "$$sid"] } } },
                { $group: { _id: null, n: { $sum: 1 }, total: { $sum: "$total" }, paid: { $sum: "$amountPaid" } } },
              ],
              as: "stats",
            },
          },
          {
            $project: {
              _id: { $toString: "$_id" },
              name: 1,
              phone: 1,
              email: { $ifNull: ["$email", ""] },
              address: { $ifNull: ["$address", ""] },
              purchaseCount: { $ifNull: [{ $first: "$stats.n" }, 0] },
              totalPurchased: { $round: [{ $ifNull: [{ $first: "$stats.total" }, 0] }, 2] },
              totalDue: {
                $round: [
                  { $subtract: [{ $ifNull: [{ $first: "$stats.total" }, 0] }, { $ifNull: [{ $first: "$stats.paid" }, 0] }] },
                  2,
                ],
              },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0, page, pageSize };
}

export async function getSupplier(id: string): Promise<ISupplier | null> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) return null;
  return Supplier.findById(id).lean<ISupplier>();
}

export async function listSupplierOptions(): Promise<{ value: string; label: string }[]> {
  await connectDB();
  const rows = await Supplier.find().sort({ name: 1 }).lean<ISupplier[]>();
  return rows.map((s) => ({ value: String(s._id), label: s.name }));
}

export async function createSupplier(data: SupplierData, user: SessionUser): Promise<string> {
  await connectDB();
  const doc = await Supplier.create(data);
  await logAudit({ user, action: "create", entity: "supplier", entityId: String(doc._id), meta: { name: data.name } });
  return String(doc._id);
}

export async function updateSupplier(id: string, data: SupplierData, user: SessionUser): Promise<void> {
  await connectDB();
  const res = await Supplier.updateOne({ _id: id }, { $set: data }, { runValidators: true });
  if (res.matchedCount === 0) throw new ApiError(404, "Supplier not found.");
  await logAudit({ user, action: "update", entity: "supplier", entityId: id, meta: { name: data.name } });
}

export async function deleteSupplier(id: string, user: SessionUser): Promise<void> {
  await connectDB();
  const supplier = await Supplier.findById(id).lean<ISupplier>();
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (await Purchase.exists({ supplier: supplier._id })) {
    throw new ApiError(409, "This supplier has purchase history and cannot be deleted.");
  }
  await Supplier.deleteOne({ _id: supplier._id });
  await logAudit({ user, action: "delete", entity: "supplier", entityId: id, meta: { name: supplier.name } });
}

/* Categories */

export async function createCategory(data: CategoryData, user: SessionUser): Promise<string> {
  await connectDB();
  const doc = await Category.create(data);
  await logAudit({ user, action: "create", entity: "category", entityId: String(doc._id), meta: { name: data.name } });
  return String(doc._id);
}

export async function updateCategory(id: string, data: CategoryData, user: SessionUser): Promise<void> {
  await connectDB();
  const res = await Category.updateOne({ _id: id }, { $set: data }, { runValidators: true });
  if (res.matchedCount === 0) throw new ApiError(404, "Category not found.");
  await logAudit({ user, action: "update", entity: "category", entityId: id, meta: { name: data.name } });
}

export async function deleteCategory(id: string, user: SessionUser): Promise<void> {
  await connectDB();
  const category = await Category.findById(id).lean<ICategory>();
  if (!category) throw new ApiError(404, "Category not found.");
  const count = await Medicine.countDocuments({ category: category._id });
  if (count > 0) throw new ApiError(409, `This category is used by ${count} medicine(s) and cannot be deleted.`);
  await Category.deleteOne({ _id: category._id });
  await logAudit({ user, action: "delete", entity: "category", entityId: id, meta: { name: category.name } });
}