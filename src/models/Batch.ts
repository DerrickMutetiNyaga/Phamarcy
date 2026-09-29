import { model, models, Schema, type Model, type Types } from "mongoose";

export interface IBatch {
  _id: Types.ObjectId;
  medicine: Types.ObjectId;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
  purchasePrice: number;
  supplier?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    batchNo: { type: String, required: true, trim: true, uppercase: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
  },
  { timestamps: true }
);

BatchSchema.index({ medicine: 1, batchNo: 1 }, { unique: true });
BatchSchema.index({ medicine: 1, expiryDate: 1 });
BatchSchema.index({ expiryDate: 1 });

export const Batch: Model<IBatch> = (models.Batch as Model<IBatch>) ?? model<IBatch>("Batch", BatchSchema);
