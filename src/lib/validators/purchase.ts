import { z } from "zod";
import { round2 } from "@/lib/format";
import { dateString, money, objectId, optionalText, positiveInt } from "./common";

export const PAYMENT_STATUSES = ["paid", "partial", "due"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  due: "Due",
};

export const purchaseItemSchema = z.object({
  medicine: objectId.or(z.literal("")).refine((v) => v !== "", "Select a medicine"),
  batchNo: z
    .string()
    .trim()
    .min(1, "Batch no. is required")
    .max(40, "Batch no. is too long")
    .transform((v) => v.toUpperCase()),
  expiryDate: dateString("Expiry date"),
  quantity: positiveInt("Quantity"),
  unitCost: money("Unit cost"),
});

export function purchaseTotal(items: { quantity: number; unitCost: number }[]): number {
  return round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unitCost), 0));
}

export const purchaseSchema = z
  .object({
    supplier: objectId.or(z.literal("")).refine((v) => v !== "", "Select a supplier"),
    supplierInvoiceNo: optionalText(60),
    date: dateString("Purchase date"),
    items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
    amountPaid: money("Amount paid"),
    notes: optionalText(500),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.items.forEach((item, index) => {
      const key = `${item.medicine}:${item.batchNo}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["items", index, "batchNo"], message: "Duplicate batch for this medicine" });
      }
      seen.add(key);
      if (item.expiryDate <= value.date) {
        ctx.addIssue({ code: "custom", path: ["items", index, "expiryDate"], message: "Expiry must be after the purchase date" });
      }
    });
    if (value.amountPaid > purchaseTotal(value.items)) {
      ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Amount paid cannot exceed the total" });
    }
  });
export type PurchaseInput = z.input<typeof purchaseSchema>;

export const purchasePaymentSchema = z.object({
  amount: money("Amount").refine((v) => v > 0, "Amount must be greater than 0"),
  note: optionalText(200),
});
export type PurchasePaymentInput = z.input<typeof purchasePaymentSchema>;

export function paymentStatusFor(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return total === 0 ? "paid" : "due";
  return round2(paid) >= round2(total) ? "paid" : "partial";
}
