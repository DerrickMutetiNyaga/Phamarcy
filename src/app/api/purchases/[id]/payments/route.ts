import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { purchasePaymentSchema } from "@/lib/validators/purchase";
import { apiRoute, ok, readJson } from "@/server/http";
import { recordPurchasePayment } from "@/server/services/purchases";

export const POST = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, purchasePaymentSchema);
  await recordPurchasePayment(params.id, data.amount, data.note, user);
  return ok({ ok: true });
});
