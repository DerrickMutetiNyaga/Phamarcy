import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { stockAdjustmentSchema } from "@/lib/validators/stock";
import { apiRoute, ok, readJson } from "@/server/http";
import { adjustBatchStock } from "@/server/services/inventory";

export const POST = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, stockAdjustmentSchema);
  await adjustBatchStock(params.id, data, user);
  return ok({ ok: true });
});
