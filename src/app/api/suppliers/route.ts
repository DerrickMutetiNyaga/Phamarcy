import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { supplierSchema } from "@/lib/validators/party";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok, readJson } from "@/server/http";
import { EXPORT_LIMIT, isCsv, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createSupplier, listSuppliers } from "@/server/services/parties";

export const GET = apiRoute(INVENTORY_ROLES, async ({ req }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listSuppliers(param(sp, "q"), csv ? 1 : pageParam(sp), csv ? EXPORT_LIMIT : undefined);
  if (!csv) return ok(result);
  return csvResponse(
    "suppliers",
    toCsv(result.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Phone", value: (r) => r.phone },
      { header: "Email", value: (r) => r.email },
      { header: "Address", value: (r) => r.address },
      { header: "Purchases", value: (r) => r.purchaseCount },
      { header: "Total purchased", value: (r) => r.totalPurchased.toFixed(2) },
      { header: "Outstanding", value: (r) => r.totalDue.toFixed(2) },
    ])
  );
});

export const POST = apiRoute(INVENTORY_ROLES, async ({ req, user }) => {
  const data = await readJson(req, supplierSchema);
  const id = await createSupplier(data, user);
  return ok({ id }, 201);
});
