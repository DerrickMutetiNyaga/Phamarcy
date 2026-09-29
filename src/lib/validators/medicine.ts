import { z } from "zod";
import { money, objectId, optionalText, requiredText } from "./common";

export const MEDICINE_UNITS = ["tablet", "strip", "bottle", "syrup"] as const;
export type MedicineUnit = (typeof MEDICINE_UNITS)[number];

export const UNIT_LABELS: Record<MedicineUnit, string> = {
  tablet: "Tablet",
  strip: "Strip",
  bottle: "Bottle",
  syrup: "Syrup",
};

export const medicineSchema = z.object({
  name: requiredText("Name", 120),
  genericName: requiredText("Generic name", 120),
  brand: optionalText(80),
  category: objectId.or(z.literal("")).refine((v) => v !== "", "Select a category"),
  manufacturer: optionalText(120),
  unit: z.enum(MEDICINE_UNITS, { error: "Select a unit" }),
  strength: optionalText(40),
  barcode: z
    .string()
    .trim()
    .max(64, "Barcode must be at most 64 characters")
    .regex(/^[A-Za-z0-9\-_.]*$/, "Barcode can only contain letters, numbers, - _ .")
    .optional()
    .default(""),
  salePrice: money("Sale price"),
  purchasePrice: money("Purchase price"),
  taxPercent: z
    .number({ error: "Tax % is required" })
    .min(0, "Tax % cannot be negative")
    .max(100, "Tax % cannot exceed 100"),
  prescriptionRequired: z.boolean(),
  reorderLevel: z
    .number({ error: "Reorder level is required" })
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative"),
  imageUrl: z.union([z.literal(""), z.url("Invalid image URL")]).optional().default(""),
  imagePublicId: z.string().optional().default(""),
  isActive: z.boolean(),
});
export type MedicineInput = z.input<typeof medicineSchema>;
export type MedicineData = z.output<typeof medicineSchema>;
