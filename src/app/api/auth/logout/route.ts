import { clearSessionCookie } from "@/server/auth";
import { ok } from "@/server/http";

export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
