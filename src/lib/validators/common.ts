import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference");

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .regex(/^\+?[\d\s\-()]{7,20}$/, "Enter a valid phone number")
  .transform(normalizePhone);

export const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

export const optionalText = (max = 500) =>
  z.string().trim().max(max, `Must be at most ${max} characters`).optional().default("");

export const optionalEmail = z
  .union([z.literal(""), z.email("Enter a valid email address")])
  .optional()
  .default("");

export const money = (label: string) =>
  z
    .number({ error: `${label} is required` })
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} is too large`);

export const positiveInt = (label: string) =>
  z
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`)
    .max(1_000_000, `${label} is too large`);

export const dateString = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), `${label} is not a valid date`);
