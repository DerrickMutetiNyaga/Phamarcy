import { model, models, Schema, type Model, type Types } from "mongoose";
import { ROLES, type Role } from "@/lib/auth/roles";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User: Model<IUser> = (models.User as Model<IUser>) ?? model<IUser>("User", UserSchema);
