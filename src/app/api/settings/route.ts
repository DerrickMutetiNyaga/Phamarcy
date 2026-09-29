import { ADMIN_ONLY, ALL_ROLES } from "@/lib/auth/roles";
import { settingsSchema } from "@/lib/validators/settings";
import { logAudit } from "@/server/audit";
import { apiRoute, ok, readJson } from "@/server/http";
import { loadSettings, saveSettings } from "@/server/settings";

export const GET = apiRoute(ALL_ROLES, async () => ok(await loadSettings()));

export const PUT = apiRoute(ADMIN_ONLY, async ({ req, user }) => {
  const data = await readJson(req, settingsSchema);
  const saved = await saveSettings(data);
  await logAudit({ user, action: "update", entity: "settings", meta: { pharmacyName: data.pharmacyName } });
  return ok(saved);
});
