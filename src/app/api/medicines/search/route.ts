import { ALL_ROLES } from "@/lib/auth/roles";
import { apiRoute, ok } from "@/server/http";
import { param, searchParamsFromRequest } from "@/server/query";
import { POS_CATALOG_LIMIT, searchSellable } from "@/server/services/inventory";

export const GET = apiRoute(ALL_ROLES, async ({ req }) => {
  const q = param(searchParamsFromRequest(req.url), "q").slice(0, 80);
  return ok(await searchSellable(q, q ? 20 : POS_CATALOG_LIMIT));
});
