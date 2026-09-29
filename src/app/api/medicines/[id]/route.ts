import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { medicineSchema } from "@/lib/validators/medicine";
import { apiRoute, ok, readJson } from "@/server/http";
import { deleteMedicine, updateMedicine } from "@/server/services/inventory";

export const PATCH = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, medicineSchema);
  await updateMedicine(params.id, data, user);
  return ok({ ok: true });
});

export const DELETE = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ params, user }) => {
  await deleteMedicine(params.id, user);
  return ok({ ok: true });
});
