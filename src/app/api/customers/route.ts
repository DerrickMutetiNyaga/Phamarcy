import { COUNTER_ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { serialize } from "@/lib/serialize";
import { customerSchema } from "@/lib/validators/party";
import { csvResponse, toCsv } from "@/server/csv";
import { apiRoute, ok, readJson } from "@/server/http";
import { EXPORT_LIMIT, isCsv, pageParam, param, searchParamsFromRequest } from "@/server/query";
import { createCustomer, listCustomers } from "@/server/services/parties";

export const GET = apiRoute(COUNTER_ROLES, async ({ req }) => {
  const sp = searchParamsFromRequest(req.url);
  const csv = isCsv(sp);
  const result = await listCustomers(param(sp, "q"), csv ? 1 : pageParam(sp), csv ? EXPORT_LIMIT : undefined);
  if (!csv) return ok(result);
  return csvResponse(
    "customers",
    toCsv(result.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Phone", value: (r) => r.phone },
      { header: "Email", value: (r) => r.email },
      { header: "Address", value: (r) => r.address },
      { header: "Visits", value: (r) => r.visits },
      { header: "Total spent", value: (r) => r.totalSpent.toFixed(2) },
      { header: "Last visit", value: (r) => (r.lastVisit ? formatDate(r.lastVisit) : "") },
    ])
  );
});

export const POST = apiRoute(COUNTER_ROLES, async ({ req, user }) => {
  const data = await readJson(req, customerSchema);
  const customer = await createCustomer(data, user);
  return ok(serialize(customer), 201);
});
