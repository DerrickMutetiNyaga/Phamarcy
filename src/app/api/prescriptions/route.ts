import { ALL_ROLES } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import {
  prescriptionCreateSchema,
  PRESCRIPTION_STATUS_LABELS,
  PRESCRIPTION_STATUSES,
} from "@/lib/validators/prescription";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ApiError, ok } from "@/server/http";
import { dateRangeParam, EXPORT_LIMIT, isCsv, oneOf, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createPrescription, listPrescriptions } from "@/server/services/prescriptions";

export const GET = apiRoute(ALL_ROLES, async ({ req, user }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listPrescriptions({
    q: param(sp, "q"),
    status: user.role === "cashier" ? "verified" : oneOf(sp, "status", PRESCRIPTION_STATUSES),
    range: dateRangeParam(sp),
    page: csv ? 1 : pageParam(sp),
    pageSize: csv ? EXPORT_LIMIT : undefined,
  });
  if (!csv) return ok(result);
  return csvResponse(
    "prescriptions",
    toCsv(result.rows, [
      { header: "Patient", value: (r) => r.customerName },
      { header: "Phone", value: (r) => r.phone },
      { header: "Notes", value: (r) => r.notes },
      { header: "Uploaded", value: (r) => formatDateTime(r.createdAt) },
      { header: "Uploaded by", value: (r) => r.uploadedByName },
      { header: "Status", value: (r) => PRESCRIPTION_STATUS_LABELS[r.status] },
      { header: "Reviewed by", value: (r) => r.reviewedByName },
      { header: "Reviewed at", value: (r) => (r.reviewedAt ? formatDateTime(r.reviewedAt) : "") },
      { header: "Review note", value: (r) => r.reviewNote },
      { header: "Image URL", value: (r) => r.imageUrl },
    ])
  );
});

export const POST = apiRoute(ALL_ROLES, async ({ req, user }) => {
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Upload must be sent as multipart form data.");
  });
  const data = prescriptionCreateSchema.parse({
    customerName: form.get("customerName") ?? "",
    phone: form.get("phone") ?? "",
    notes: form.get("notes") ?? "",
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image of the prescription");
  const id = await createPrescription(data, file, user);
  return ok({ id }, 201);
});
