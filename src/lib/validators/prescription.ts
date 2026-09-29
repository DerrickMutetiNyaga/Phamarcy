import { z } from "zod";
import { optionalText, phoneSchema, requiredText } from "./common";

export const PRESCRIPTION_STATUSES = ["pending", "verified", "rejected"] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export const prescriptionCreateSchema = z.object({
  customerName: requiredText("Patient name", 100),
  phone: phoneSchema,
  notes: optionalText(500),
});
export type PrescriptionCreateInput = z.input<typeof prescriptionCreateSchema>;

export const prescriptionReviewSchema = z
  .object({
    status: z.enum(["verified", "rejected"], { error: "Choose verify or reject" }),
    reviewNote: optionalText(500),
  })
  .refine((v) => v.status !== "rejected" || v.reviewNote.length > 0, {
    path: ["reviewNote"],
    message: "A note is required when rejecting",
  });
export type PrescriptionReviewInput = z.input<typeof prescriptionReviewSchema>;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: { type: string; size: number } | null | undefined): string | null {
  if (!file || file.size === 0) return "Choose an image to upload";
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Only JPG, PNG or WEBP images are allowed";
  if (file.size > MAX_UPLOAD_BYTES) return "Image must be 5 MB or smaller";
  return null;
}
