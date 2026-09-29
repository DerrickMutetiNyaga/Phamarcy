import { z } from "zod";
import { optionalText, requiredText } from "./common";

export const settingsSchema = z.object({
  pharmacyName: requiredText("Pharmacy name", 100),
  address: optionalText(300),
  phone: optionalText(40),
  taxNumber: optionalText(60),
  receiptFooter: optionalText(300),
  currencySymbol: requiredText("Currency symbol", 5),
  lowStockDefault: z
    .number({ error: "Low stock default is required" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(100000, "Too large"),
});
export type SettingsInput = z.input<typeof settingsSchema>;
