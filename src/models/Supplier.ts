import { model, models, Schema, type Model, type Types } from "mongoose";

export interface ISupplier {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: 1 });
SupplierSchema.index({ phone: 1 });

export const Supplier: Model<ISupplier> =
  (models.Supplier as Model<ISupplier>) ?? model<ISupplier>("Supplier", SupplierSchema);
