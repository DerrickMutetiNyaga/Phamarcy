import { model, models, Schema, type Model, type Types } from "mongoose";
import { MEDICINE_UNITS, type MedicineUnit } from "@/lib/validators/medicine";

export interface IMedicine {
  _id: Types.ObjectId;
  name: string;
  genericName: string;
  brand?: string;
  category: Types.ObjectId;
  manufacturer?: string;
  unit: MedicineUnit;
  strength?: string;
  barcode?: string;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  prescriptionRequired: boolean;
  reorderLevel: number;
  imageUrl?: string;
  imagePublicId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    manufacturer: { type: String, trim: true, default: "" },
    unit: { type: String, enum: MEDICINE_UNITS, required: true },
    strength: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true },
    salePrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    prescriptionRequired: { type: Boolean, default: false },
    reorderLevel: { type: Number, required: true, min: 0, default: 10 },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MedicineSchema.index(
  { barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: "string", $gt: "" } } }
);
MedicineSchema.index(
  { name: "text", genericName: "text", brand: "text" },
  { weights: { name: 10, genericName: 5, brand: 2 }, name: "medicine_text" }
);
MedicineSchema.index({ name: 1 });
MedicineSchema.index({ category: 1 });
MedicineSchema.index({ isActive: 1, name: 1 });

export const Medicine: Model<IMedicine> =
  (models.Medicine as Model<IMedicine>) ?? model<IMedicine>("Medicine", MedicineSchema);
