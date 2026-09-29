import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { prescriptionReviewSchema } from "@/lib/validators/prescription";
import { apiRoute, ok, readJson } from "@/server/http";
import { deletePrescription, reviewPrescription } from "@/server/services/prescriptions";

export const PATCH = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ req, params, user }) => {
  const data = await readJson(req, prescriptionReviewSchema);
  await reviewPrescription(params.id, data, user);
  return ok({ ok: true });
});

export const DELETE = apiRoute<{ id: string }>(INVENTORY_ROLES, async ({ params, user }) => {
  await deletePrescription(params.id, user);
  return ok({ ok: true });
});
