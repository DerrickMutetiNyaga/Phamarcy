import { ALL_ROLES, INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { medicineSchema, UNIT_LABELS } from "@/lib/validators/medicine";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok, readJson } from "@/server/http";
import { EXPORT_LIMIT, isCsv, oneOf, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createMedicine, listMedicines, STOCK_FILTERS } from "@/server/services/inventory";

export const GET = apiRoute(ALL_ROLES, async ({ req }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listMedicines({
    q: param(sp, "q"),
    category: param(sp, "category"),
    stock: oneOf(sp, "stock", STOCK_FILTERS),
    status: oneOf(sp, "status", ["active", "inactive"] as const),
    page: csv ? 1 : pageParam(sp),
    pageSize: csv ? EXPORT_LIMIT : undefined,
  });
  if (!csv) return ok(result);
  return csvResponse(
    "medicines",
    toCsv(result.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Generic name", value: (r) => r.genericName },
      { header: "Brand", value: (r) => r.brand },
      { header: "Strength", value: (r) => r.strength },
      { header: "Unit", value: (r) => UNIT_LABELS[r.unit] },
      { header: "Category", value: (r) => r.categoryName },
      { header: "Barcode", value: (r) => r.barcode },
      { header: "Sale price", value: (r) => r.salePrice.toFixed(2) },
      { header: "Purchase price", value: (r) => r.purchasePrice.toFixed(2) },
      { header: "Tax %", value: (r) => r.taxPercent },
      { header: "Rx required", value: (r) => (r.prescriptionRequired ? "Yes" : "No") },
      { header: "Stock", value: (r) => r.stock },
      { header: "Reorder level", value: (r) => r.reorderLevel },
      { header: "Nearest expiry", value: (r) => (r.nearestExpiry ? formatDate(r.nearestExpiry) : "") },
      { header: "Status", value: (r) => (r.isActive ? "Active" : "Inactive") },
    ])
  );
});

export const POST = apiRoute(INVENTORY_ROLES, async ({ req, user }) => {
  const data = await readJson(req, medicineSchema);
  const id = await createMedicine(data, user);
  return ok({ id }, 201);
});
