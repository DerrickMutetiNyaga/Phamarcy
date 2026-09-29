import { COUNTER_ROLES } from "@/lib/auth/roles";
import { customerSchema } from "@/lib/validators/party";
import { apiRoute, ok, readJson } from "@/server/http";
import { deleteCustomer, updateCustomer } from "@/server/services/parties";

export const PATCH = apiRoute<{ id: string }>(COUNTER_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, customerSchema);
  await updateCustomer(params.id, data, user);
  return ok({ ok: true });
});

export const DELETE = apiRoute<{ id: string }>(COUNTER_ROLES, async ({ params, user }) => {
  await deleteCustomer(params.id, user);
  return ok({ ok: true });
});
