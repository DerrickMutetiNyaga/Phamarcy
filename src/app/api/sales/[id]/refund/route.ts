import { ADMIN_ONLY } from "@/lib/auth/roles";
import { refundSchema } from "@/lib/validators/sale";
import { apiRoute, ok, readJson } from "@/server/http";
import { refundSale } from "@/server/services/sales";

export const POST = apiRoute<{ id: string }>(ADMIN_ONLY, async ({ req, params, user }) => {
  const { reason } = await readJson(req, refundSchema);
  await refundSale(params.id, reason, user);
  return ok({ ok: true });
});
