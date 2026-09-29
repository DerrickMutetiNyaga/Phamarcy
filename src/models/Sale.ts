import { model, models, Schema, type Model, type Types } from "mongoose";
import { PAYMENT_METHODS, SALE_STATUSES, type PaymentMethod, type SaleStatus } from "@/lib/validators/sale";

export interface ISaleItem {
  medicine: Types.ObjectId;
  batch: Types.ObjectId;
  batchNo: string;
  expiryDate: Date;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxPercent: number;
  tax: number;
  discount: number;
  total: number;
}

export interface ISale {
  _id: Types.ObjectId;
  invoiceNo: string;
  customer?: Types.ObjectId | null;
  customerName: string;
  customerPhone: string;
  items: ISaleItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  billDiscount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number | null;
  prescription?: Types.ObjectId | null;
  soldBy: Types.ObjectId;
  status: SaleStatus;
  refundReason?: string;
  refundedBy?: Types.ObjectId | null;
  refundedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    batchNo: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    invoiceNo: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: "Walk-in customer" },
    customerPhone: { type: String, default: "" },
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    discountTotal: { type: Number, required: true },
    billDiscount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    amountTendered: { type: Number, default: null },
    prescription: { type: Schema.Types.ObjectId, ref: "Prescription", default: null },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: SALE_STATUSES, default: "completed" },
    refundReason: { type: String, default: "" },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ status: 1, createdAt: -1 });
SaleSchema.index({ soldBy: 1, createdAt: -1 });
SaleSchema.index({ customer: 1, createdAt: -1 });
SaleSchema.index({ "items.medicine": 1 });

export const Sale: Model<ISale> = (models.Sale as Model<ISale>) ?? model<ISale>("Sale", SaleSchema);
