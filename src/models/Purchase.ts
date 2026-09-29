import { model, models, Schema, type Model, type Types } from "mongoose";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/validators/purchase";

export interface IPurchaseItem {
  medicine: Types.ObjectId;
  name: string;
  batch: Types.ObjectId;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface IPurchasePayment {
  amount: number;
  date: Date;
  note?: string;
  user: Types.ObjectId;
}

export interface IPurchase {
  _id: Types.ObjectId;
  purchaseNo: string;
  supplier: Types.ObjectId;
  supplierInvoiceNo?: string;
  date: Date;
  items: IPurchaseItem[];
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  payments: IPurchasePayment[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    name: { type: String, required: true },
    batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    batchNo: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPurchasePayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseNo: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierInvoiceNo: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
    items: { type: [PurchaseItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true },
    payments: { type: [PaymentSchema], default: [] },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PurchaseSchema.index({ date: -1 });
PurchaseSchema.index({ supplier: 1, date: -1 });
PurchaseSchema.index({ paymentStatus: 1 });

export const Purchase: Model<IPurchase> =
  (models.Purchase as Model<IPurchase>) ?? model<IPurchase>("Purchase", PurchaseSchema);
