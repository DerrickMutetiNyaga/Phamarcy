import { ADMIN_ONLY } from "@/lib/auth/roles";
import { userUpdateSchema } from "@/lib/validators/auth";
import { apiRoute, ok, readJson } from "@/server/http";
import { updateUser } from "@/server/services/users";

export const PATCH = apiRoute<{ id: string }>(ADMIN_ONLY, async ({ req, params, user }) => {
  const data = await readJson(req, userUpdateSchema);
  await updateUser(params.id, data, user);
  return ok({ ok: true });
});
