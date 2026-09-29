import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { homeForRole } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/validators/auth";
import { User, type IUser } from "@/models";
import { logAudit } from "@/server/audit";
import { setSessionCookie } from "@/server/auth";
import { errorResponse, ok, readJson, toErrorResponse } from "@/server/http";
import { hitRateLimit, resetRateLimit } from "@/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await readJson(req, loginSchema);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const key = `login:${ip}:${email.toLowerCase()}`;
    const limit = hitRateLimit(key, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return errorResponse(429, `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`);
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").lean<IUser>();
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) return errorResponse(401, "Incorrect email or password.");
    if (!user.isActive) return errorResponse(403, "This account has been deactivated. Contact an administrator.");

    resetRateLimit(key);
    const token = await signSession({ sub: String(user._id), role: user.role, name: user.name });
    await setSessionCookie(token);
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    await logAudit({ user: { id: String(user._id), name: user.name }, action: "login", entity: "user", entityId: String(user._id) });

    return ok({ redirectTo: homeForRole(user.role) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
