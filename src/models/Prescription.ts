import { model, models, Schema, type Model, type Types } from "mongoose";
import { PRESCRIPTION_STATUSES, type PrescriptionStatus } from "@/lib/validators/prescription";

export interface IPrescription {
  _id: Types.ObjectId;
  customerName: string;
  phone: string;
  imageUrl: string;
  imagePublicId?: string;
  notes?: string;
  status: PrescriptionStatus;
  reviewNote?: string;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, default: "" },
    notes: { type: String, trim: true, default: "" },
    status: { type: String, enum: PRESCRIPTION_STATUSES, default: "pending" },
    reviewNote: { type: String, trim: true, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ status: 1, createdAt: -1 });
PrescriptionSchema.index({ phone: 1 });

export const Prescription: Model<IPrescription> =
  (models.Prescription as Model<IPrescription>) ?? model<IPrescription>("Prescription", PrescriptionSchema);
