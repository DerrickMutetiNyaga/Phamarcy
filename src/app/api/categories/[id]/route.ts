import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { categorySchema } from "@/lib/validators/party";
import { apiRoute, ok, readJson } from "@/server/http";
import { deleteCategory, updateCategory } from "@/server/services/parties";

export const PATCH = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, categorySchema);
  await updateCategory(params.id, data, user);
  return ok({ ok: true });
});

export const DELETE = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ params, user }) => {
  await deleteCategory(params.id, user);
  return ok({ ok: true });
});
