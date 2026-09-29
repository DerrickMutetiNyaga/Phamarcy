import { model, models, Schema, type Model, type Types } from "mongoose";

export interface ICustomer {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 1 });

export const Customer: Model<ICustomer> =
  (models.Customer as Model<ICustomer>) ?? model<ICustomer>("Customer", CustomerSchema);
