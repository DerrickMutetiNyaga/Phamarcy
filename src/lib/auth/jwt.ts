import { jwtVerify, SignJWT } from "jose";
import { getJwtSecret } from "@/lib/env";
import { isRole, SESSION_TTL_SECONDS, type SessionPayload } from "./roles";

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || !isRole(payload.role) || typeof payload.name !== "string") return null;
    return { sub: payload.sub, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}
