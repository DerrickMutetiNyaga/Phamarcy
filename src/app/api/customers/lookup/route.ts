import { COUNTER_ROLES } from "@/lib/auth/roles";
import { serialize } from "@/lib/serialize";
import { normalizePhone } from "@/lib/validators/common";
import { apiRoute, ApiError, ok } from "@/server/http";
import { param, searchParamsFromRequest } from "@/server/query";
import { findCustomerByPhone } from "@/server/services/parties";

export const GET = apiRoute(COUNTER_ROLES, async ({ req }) => {
  const phone = normalizePhone(param(searchParamsFromRequest(req.url), "phone"));
  if (phone.replace("+", "").length < 7) throw new ApiError(400, "Enter a valid phone number");
  const customer = await findCustomerByPhone(phone);
  return ok({ customer: customer ? serialize(customer) : null });
});
