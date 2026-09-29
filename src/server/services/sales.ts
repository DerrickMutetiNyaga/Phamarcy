import { Types } from "mongoose";
import type { z } from "zod";
import { connectDB, withTransaction } from "@/lib/db";
import { formatMoney, round2 } from "@/lib/format";
import { priceCart, splitAmount } from "@/lib/pricing";
import { escapeRegex } from "@/lib/serialize";
import type { PaymentMethod, SaleStatus, saleSchema } from "@/lib/validators/sale";
import {
  Batch,
  Customer,
  Medicine,
  nextSequence,
  Prescription,
  Sale,
  User,
  type IBatch,
  type ICustomer,
  type IMedicine,
  type IPrescription,
  type ISale,
  type ISaleItem,
} from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { ApiError } from "../http";
import { dateMatch, PAGE_SIZE, skipFor, type DateRange, type Paginated } from "../query";

type SaleData = z.output<typeof saleSchema>;

interface MergedLine {
  medicine: string;
  quantity: number;
  discount: number;
}

function mergeLines(items: SaleData["items"]): MergedLine[] {
  const map = new Map<string, MergedLine>();
  for (const item of items) {
    const existing = map.get(item.medicine);
    if (existing) {
      existing.quantity += item.quantity;
      existing.discount = round2(existing.discount + item.discount);
    } else {
      map.set(item.medicine, { medicine: item.medicine, quantity: item.quantity, discount: round2(item.discount) });
    }
  }
  return [...map.values()];
}

function medicineLabel(m: IMedicine): string {
  return [m.name, m.strength].filter(Boolean).join(" ");
}

export async function createSale(data: SaleData, user: SessionUser): Promise<{ id: string; invoiceNo: string }> {
  const lines = mergeLines(data.items);

  return withTransaction(async (session) => {
    const medicines = await Medicine.find({ _id: { $in: lines.map((l) => l.medicine) } })
      .session(session)
      .lean<IMedicine[]>();
    const byId = new Map(medicines.map((m) => [String(m._id), m]));

    for (const line of lines) {
      const med = byId.get(line.medicine);
      if (!med || !med.isActive) throw new ApiError(400, "One of the items is no longer available for sale.");
    }

    const rxRequired = lines.map((l) => byId.get(l.medicine)!).filter((m) => m.prescriptionRequired);
    let prescription: IPrescription | null = null;
    if (data.prescription) {
      prescription = await Prescription.findById(data.prescription).session(session).lean<IPrescription>();
      if (!prescription) throw new ApiError(400, "The attached prescription was not found.");
      if (prescription.status !== "verified") throw new ApiError(400, "Only verified prescriptions can be attached to a sale.");
    }
    if (rxRequired.length > 0 && !prescription) {
      throw new ApiError(
        400,
        `A verified prescription is required for: ${rxRequired.map(medicineLabel).join(", ")}.`
      );
    }

    let customer: ICustomer | null = null;
    if (data.customer) {
      customer = await Customer.findById(data.customer).session(session).lean<ICustomer>();
      if (!customer) throw new ApiError(400, "Selected customer was not found.");
    }

    const priced = priceCart(
      lines.map((l) => {
        const med = byId.get(l.medicine)!;
        return { unitPrice: med.salePrice, quantity: l.quantity, discount: l.discount, taxPercent: med.taxPercent };
      }),
      data.billDiscount
    );
    lines.forEach((line, i) => {
      if (line.discount > priced.lines[i].gross) {
        throw new ApiError(400, `Discount on ${medicineLabel(byId.get(line.medicine)!)} exceeds the line amount.`);
      }
    });
    if (data.billDiscount > round2(priced.subtotal - priced.lineDiscountTotal)) {
      throw new ApiError(400, "Bill discount exceeds the bill amount.");
    }
    if (data.paymentMethod === "cash" && data.amountTendered !== null && data.amountTendered < priced.grandTotal) {
      throw new ApiError(400, `Cash received is less than the total of ${formatMoney(priced.grandTotal, "")}.`);
    }

    const now = new Date();
    const saleItems: ISaleItem[] = [];

    for (const [index, line] of lines.entries()) {
      const med = byId.get(line.medicine)!;
      const pricedLine = priced.lines[index];
      const batches = await Batch.find({ medicine: med._id, quantity: { $gt: 0 }, expiryDate: { $gt: now } })
        .sort({ expiryDate: 1, createdAt: 1 })
        .session(session)
        .lean<IBatch[]>();

      const available = batches.reduce((s, b) => s + b.quantity, 0);
      if (available < line.quantity) {
        throw new ApiError(409, `Only ${available} ${med.unit}(s) of ${medicineLabel(med)} in stock.`);
      }

      const allocations: { batch: IBatch; quantity: number }[] = [];
      let remaining = line.quantity;
      for (const batch of batches) {
        if (remaining === 0) break;
        const take = Math.min(batch.quantity, remaining);
        const res = await Batch.updateOne(
          { _id: batch._id, quantity: { $gte: take } },
          { $inc: { quantity: -take } },
          { session }
        );
        if (res.modifiedCount !== 1) throw new ApiError(409, "Stock changed while checking out. Please try again.");
        allocations.push({ batch, quantity: take });
        remaining -= take;
      }

      const weights = allocations.map((a) => a.quantity);
      const discounts = splitAmount(round2(pricedLine.discount + pricedLine.billDiscountShare), weights);
      const taxes = splitAmount(pricedLine.tax, weights);
      const totals = splitAmount(pricedLine.total, weights);

      allocations.forEach((a, i) => {
        saleItems.push({
          medicine: med._id,
          batch: a.batch._id,
          batchNo: a.batch.batchNo,
          expiryDate: a.batch.expiryDate,
          name: medicineLabel(med),
          quantity: a.quantity,
          unitPrice: med.salePrice,
          costPrice: a.batch.purchasePrice,
          taxPercent: med.taxPercent,
          tax: taxes[i],
          discount: discounts[i],
          total: totals[i],
        });
      });
    }

    const invoiceNo = await nextSequence("invoice", "INV", session);
    const [sale] = await Sale.create(
      [
        {
          invoiceNo,
          customer: customer?._id ?? null,
          customerName: customer?.name ?? prescription?.customerName ?? "Walk-in customer",
          customerPhone: customer?.phone ?? prescription?.phone ?? "",
          items: saleItems,
          subtotal: priced.subtotal,
          taxTotal: priced.taxTotal,
          discountTotal: priced.discountTotal,
          billDiscount: priced.billDiscount,
          grandTotal: priced.grandTotal,
          paymentMethod: data.paymentMethod,
          amountTendered: data.paymentMethod === "cash" ? data.amountTendered : null,
          prescription: prescription?._id ?? null,
          soldBy: user.id,
          status: "completed",
        },
      ],
      { session }
    );

    await logAudit({
      user,
      action: "create",
      entity: "sale",
      entityId: String(sale._id),
      meta: { invoiceNo, grandTotal: priced.grandTotal, items: saleItems.length },
      session,
    });

    return { id: String(sale._id), invoiceNo };
  });
}

export async function refundSale(id: string, reason: string, user: SessionUser): Promise<void> {
  await withTransaction(async (session) => {
    const sale = await Sale.findById(id).session(session);
    if (!sale) throw new ApiError(404, "Sale not found.");
    if (sale.status === "refunded") throw new ApiError(409, "This sale has already been refunded.");

    for (const item of sale.items) {
      const res = await Batch.updateOne({ _id: item.batch }, { $inc: { quantity: item.quantity } }, { session });
      if (res.matchedCount !== 1) throw new ApiError(409, `Batch ${item.batchNo} no longer exists; stock cannot be restored.`);
    }

    sale.status = "refunded";
    sale.refundReason = reason;
    sale.refundedBy = new Types.ObjectId(user.id);
    sale.refundedAt = new Date();
    await sale.save({ session });

    await logAudit({
      user,
      action: "refund",
      entity: "sale",
      entityId: id,
      meta: { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal, reason },
      session,
    });
  });
}

export interface SaleRow {
  _id: string;
  invoiceNo: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  paymentMethod: PaymentMethod;
  soldByName: string;
  grandTotal: number;
  status: SaleStatus;
}

export interface SaleFilters {
  q?: string;
  paymentMethod?: PaymentMethod | "";
  status?: SaleStatus | "";
  range?: DateRange;
  soldBy?: string;
  customer?: string;
  page?: number;
  pageSize?: number;
}

export interface SaleListResult extends Paginated<SaleRow> {
  totalRevenue: number;
}

function saleMatch(filters: SaleFilters): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    match.$or = [{ invoiceNo: rx }, { customerName: rx }, { customerPhone: rx }];
  }
  if (filters.paymentMethod) match.paymentMethod = filters.paymentMethod;
  if (filters.status) match.status = filters.status;
  const created = filters.range ? dateMatch(filters.range) : undefined;
  if (created) match.createdAt = created;
  if (filters.soldBy && Types.ObjectId.isValid(filters.soldBy)) match.soldBy = new Types.ObjectId(filters.soldBy);
  if (filters.customer && Types.ObjectId.isValid(filters.customer)) match.customer = new Types.ObjectId(filters.customer);
  return match;
}

export async function listSales(filters: SaleFilters): Promise<SaleListResult> {
  await connectDB();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const match = saleMatch(filters);

  const [result] = await Sale.aggregate<{
    rows: SaleRow[];
    total: { n: number }[];
    revenue: { sum: number }[];
  }>([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        rows: [
          { $skip: skipFor(page, pageSize) },
          { $limit: pageSize },
          { $lookup: { from: User.collection.name, localField: "soldBy", foreignField: "_id", as: "seller" } },
          {
            $project: {
              _id: { $toString: "$_id" },
              invoiceNo: 1,
              createdAt: { $dateToString: { date: "$createdAt" } },
              customerName: 1,
              customerPhone: 1,
              itemCount: { $sum: "$items.quantity" },
              paymentMethod: 1,
              soldByName: { $ifNull: [{ $first: "$seller.name" }, ""] },
              grandTotal: 1,
              status: 1,
            },
          },
        ],
        total: [{ $count: "n" }],
        revenue: [{ $match: { status: "completed" } }, { $group: { _id: null, sum: { $sum: "$grandTotal" } } }],
      },
    },
  ]);

  return {
    rows: result?.rows ?? [],
    total: result?.total[0]?.n ?? 0,
    page,
    pageSize,
    totalRevenue: round2(result?.revenue[0]?.sum ?? 0),
  };
}

export type SaleDetail = Omit<ISale, "soldBy" | "refundedBy" | "prescription"> & {
  soldBy: { _id: Types.ObjectId; name: string } | null;
  refundedBy: { _id: Types.ObjectId; name: string } | null;
  prescription: Pick<IPrescription, "_id" | "customerName" | "imageUrl" | "status" | "createdAt"> | null;
};

export async function getSale(id: string): Promise<SaleDetail | null> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) return null;
  return Sale.findById(id)
    .populate("soldBy", "name")
    .populate("refundedBy", "name")
    .populate("prescription", "customerName imageUrl status createdAt")
    .lean<SaleDetail>();
}
