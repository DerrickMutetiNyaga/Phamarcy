import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";
import { requiredText } from "./common";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.input<typeof loginSchema>;

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const userCreateSchema = z.object({
  name: requiredText("Name", 80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: z.enum(ROLES, { error: "Select a role" }),
  password: passwordRule,
});
export type UserCreateInput = z.input<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: requiredText("Name", 80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: z.enum(ROLES, { error: "Select a role" }),
  isActive: z.boolean(),
  password: z.union([z.literal(""), passwordRule]).optional().default(""),
});
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
