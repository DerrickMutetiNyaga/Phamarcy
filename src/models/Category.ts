import { model, models, Schema, type Model, type Types } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory>) ?? model<ICategory>("Category", CategorySchema);
