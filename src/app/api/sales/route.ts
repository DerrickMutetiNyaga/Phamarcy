import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, SALE_STATUSES, saleSchema } from "@/lib/validators/sale";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok, readJson } from "@/server/http";
import { dateRangeParam, EXPORT_LIMIT, isCsv, oneOf, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createSale, listSales } from "@/server/services/sales";

export const GET = apiRoute(COUNTER_ROLES, async ({ req, user }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listSales({
    q: param(sp, "q"),
    paymentMethod: oneOf(sp, "paymentMethod", PAYMENT_METHODS),
    status: oneOf(sp, "status", SALE_STATUSES),
    range: dateRangeParam(sp),
    soldBy: user.role === "cashier" ? user.id : param(sp, "soldBy"),
    page: csv ? 1 : pageParam(sp),
    pageSize: csv ? EXPORT_LIMIT : undefined,
  });
  if (!csv) return ok(result);
  return csvResponse(
    "sales",
    toCsv(result.rows, [
      { header: "Invoice", value: (r) => r.invoiceNo },
      { header: "Date", value: (r) => formatDateTime(r.createdAt) },
      { header: "Customer", value: (r) => r.customerName },
      { header: "Phone", value: (r) => r.customerPhone },
      { header: "Items", value: (r) => r.itemCount },
      { header: "Payment", value: (r) => PAYMENT_METHOD_LABELS[r.paymentMethod] },
      { header: "Sold by", value: (r) => r.soldByName },
      { header: "Total", value: (r) => r.grandTotal.toFixed(2) },
      { header: "Status", value: (r) => (r.status === "completed" ? "Completed" : "Refunded") },
    ])
  );
});

export const POST = apiRoute(COUNTER_ROLES, async ({ req, user }) => {
  const data = await readJson(req, saleSchema);
  const result = await createSale(data, user);
  return ok(result, 201);
});
