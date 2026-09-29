import { ALL_ROLES, INVENTORY_ROLES } from "@/lib/auth/roles";
import { categorySchema } from "@/lib/validators/party";
import { apiRoute, ok, readJson } from "@/server/http";
import { listCategoryOptions } from "@/server/services/inventory";
import { createCategory } from "@/server/services/parties";

export const GET = apiRoute(ALL_ROLES, async () => ok(await listCategoryOptions()));

export const POST = apiRoute(INVENTORY_ROLES, async ({ req, user }) => {
  const data = await readJson(req, categorySchema);
  const id = await createCategory(data, user);
  return ok({ id }, 201);
});
