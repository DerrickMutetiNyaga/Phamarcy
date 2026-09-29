import bcrypt from "bcryptjs";
import type { z } from "zod";
import { connectDB } from "@/lib/db";
import type { userCreateSchema, userUpdateSchema } from "@/lib/validators/auth";
import { User, type IUser } from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { ApiError } from "../http";

export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function listUsers(): Promise<IUser[]> {
  await connectDB();
  return User.find().sort({ isActive: -1, name: 1 }).lean<IUser[]>();
}

export async function createUser(data: z.output<typeof userCreateSchema>, actor: SessionUser): Promise<string> {
  await connectDB();
  const doc = await User.create({
    name: data.name,
    email: data.email,
    role: data.role,
    passwordHash: await hashPassword(data.password),
    isActive: true,
  });
  await logAudit({ user: actor, action: "create", entity: "user", entityId: String(doc._id), meta: { email: data.email, role: data.role } });
  return String(doc._id);
}

export async function updateUser(id: string, data: z.output<typeof userUpdateSchema>, actor: SessionUser): Promise<void> {
  await connectDB();
  const user = await User.findById(id).lean<IUser>();
  if (!user) throw new ApiError(404, "User not found.");

  if (id === actor.id && (!data.isActive || data.role !== "admin")) {
    throw new ApiError(400, "You cannot deactivate your own account or remove your own admin role.");
  }
  const losingAdmin = user.role === "admin" && user.isActive && (data.role !== "admin" || !data.isActive);
  if (losingAdmin) {
    const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
    if (activeAdmins <= 1) throw new ApiError(400, "At least one active admin account is required.");
  }

  const update: Partial<IUser> = { name: data.name, email: data.email, role: data.role, isActive: data.isActive };
  if (data.password) update.passwordHash = await hashPassword(data.password);
  await User.updateOne({ _id: id }, { $set: update }, { runValidators: true });
  await logAudit({
    user: actor,
    action: "update",
    entity: "user",
    entityId: id,
    meta: { email: data.email, role: data.role, isActive: data.isActive, passwordChanged: Boolean(data.password) },
  });
}
