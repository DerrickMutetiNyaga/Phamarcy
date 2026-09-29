import { z } from "zod";
import { optionalEmail, optionalText, phoneSchema, requiredText } from "./common";

export const customerSchema = z.object({
  name: requiredText("Name", 100),
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalText(300),
});
export type CustomerInput = z.input<typeof customerSchema>;

export const supplierSchema = z.object({
  name: requiredText("Name", 120),
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalText(300),
});
export type SupplierInput = z.input<typeof supplierSchema>;

export const categorySchema = z.object({
  name: requiredText("Name", 60),
  description: optionalText(300),
});
export type CategoryInput = z.input<typeof categorySchema>;
