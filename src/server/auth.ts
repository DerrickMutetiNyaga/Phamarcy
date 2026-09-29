import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDB } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { verifySession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, type Role } from "@/lib/auth/roles";
import { User, type IUser } from "@/models";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Verifies the JWT and re-reads the user so deactivations and role changes take effect immediately. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  await connectDB();
  const user = await User.findById(payload.sub).lean<IUser>();
  if (!user || !user.isActive) return null;
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
});

export async function requireUser(roles?: readonly Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/logout");
  if (roles && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
