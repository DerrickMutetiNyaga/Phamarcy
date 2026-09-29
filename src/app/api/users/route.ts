import { ADMIN_ONLY } from "@/lib/auth/roles";
import { serialize } from "@/lib/serialize";
import { userCreateSchema } from "@/lib/validators/auth";
import { apiRoute, ok, readJson } from "@/server/http";
import { createUser, listUsers } from "@/server/services/users";

export const GET = apiRoute(ADMIN_ONLY, async () => ok(serialize(await listUsers())));

export const POST = apiRoute(ADMIN_ONLY, async ({ req, user }) => {
  const data = await readJson(req, userCreateSchema);
  const id = await createUser(data, user);
  return ok({ id }, 201);
});
