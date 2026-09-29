import { model, models, Schema, type Model, type Types } from "mongoose";
import { ADJUSTMENT_TYPES, type AdjustmentType } from "@/lib/validators/stock";

export interface IStockAdjustment {
  _id: Types.ObjectId;
  medicine: Types.ObjectId;
  batch: Types.ObjectId;
  batchNo: string;
  type: AdjustmentType;
  change: number;
  reason: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    batchNo: { type: String, required: true },
    type: { type: String, enum: ADJUSTMENT_TYPES, required: true },
    change: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

StockAdjustmentSchema.index({ medicine: 1, createdAt: -1 });

export const StockAdjustment: Model<IStockAdjustment> =
  (models.StockAdjustment as Model<IStockAdjustment>) ??
  model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);
