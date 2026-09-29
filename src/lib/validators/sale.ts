import { z } from "zod";
import { money, objectId, positiveInt, requiredText } from "./common";

export const PAYMENT_METHODS = ["cash", "mpesa", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  card: "Card",
};

export const SALE_STATUSES = ["completed", "refunded"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const saleItemSchema = z.object({
  medicine: objectId,
  quantity: positiveInt("Quantity"),
  discount: money("Discount"),
});

export const saleSchema = z.object({
  customer: objectId.nullable().optional().default(null),
  items: z.array(saleItemSchema).min(1, "Cart is empty").max(200, "Too many items in one sale"),
  billDiscount: money("Bill discount"),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Select a payment method" }),
  amountTendered: money("Amount tendered").nullable().optional().default(null),
  prescription: objectId.nullable().optional().default(null),
});
export type SaleInput = z.input<typeof saleSchema>;

export const refundSchema = z.object({
  reason: requiredText("Reason", 300).refine((v) => v.length >= 3, "Reason must be at least 3 characters"),
});
export type RefundInput = z.input<typeof refundSchema>;
