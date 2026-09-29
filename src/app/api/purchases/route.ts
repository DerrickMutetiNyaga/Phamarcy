import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES, purchaseSchema } from "@/lib/validators/purchase";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok, readJson } from "@/server/http";
import { dateRangeParam, EXPORT_LIMIT, isCsv, oneOf, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createPurchase, listPurchases } from "@/server/services/purchases";

export const GET = apiRoute(INVENTORY_ROLES, async ({ req }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listPurchases({
    q: param(sp, "q"),
    supplier: param(sp, "supplier"),
    paymentStatus: oneOf(sp, "paymentStatus", PAYMENT_STATUSES),
    range: dateRangeParam(sp),
    page: csv ? 1 : pageParam(sp),
    pageSize: csv ? EXPORT_LIMIT : undefined,
  });
  if (!csv) return ok(result);
  return csvResponse(
    "purchases",
    toCsv(result.rows, [
      { header: "Purchase no.", value: (r) => r.purchaseNo },
      { header: "Date", value: (r) => formatDate(r.date) },
      { header: "Supplier", value: (r) => r.supplierName },
      { header: "Supplier invoice", value: (r) => r.supplierInvoiceNo },
      { header: "Lines", value: (r) => r.itemCount },
      { header: "Total", value: (r) => r.total.toFixed(2) },
      { header: "Paid", value: (r) => r.amountPaid.toFixed(2) },
      { header: "Due", value: (r) => r.due.toFixed(2) },
      { header: "Status", value: (r) => PAYMENT_STATUS_LABELS[r.paymentStatus] },
    ])
  );
});

export const POST = apiRoute(INVENTORY_ROLES, async ({ req, user }) => {
  const data = await readJson(req, purchaseSchema);
  const result = await createPurchase(data, user);
  return ok(result, 201);
});
