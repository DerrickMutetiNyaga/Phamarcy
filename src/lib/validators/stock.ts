import { z } from "zod";
import { positiveInt, requiredText } from "./common";

export const ADJUSTMENT_TYPES = ["damage", "loss", "expired", "correction"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  damage: "Damage",
  loss: "Loss / theft",
  expired: "Expired (write-off)",
  correction: "Count correction",
};

export const stockAdjustmentSchema = z
  .object({
    type: z.enum(ADJUSTMENT_TYPES, { error: "Select a type" }),
    direction: z.enum(["decrease", "increase"]),
    quantity: positiveInt("Quantity"),
    reason: requiredText("Reason", 300).refine((v) => v.length >= 3, "Reason must be at least 3 characters"),
  })
  .refine((v) => v.direction === "decrease" || v.type === "correction", {
    path: ["direction"],
    message: "Only count corrections can increase stock",
  });
export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
