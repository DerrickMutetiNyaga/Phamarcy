import { NextResponse, type NextRequest } from "next/server";
import { canAccessApi, canAccessPage, isPublicPath } from "@/lib/auth/access";
import { verifySession } from "@/lib/auth/jwt";
import { homeForRole, SESSION_COOKIE } from "@/lib/auth/roles";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function isCrossOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && MUTATING.has(request.method) && isCrossOrigin(request)) {
    return jsonError(403, "Cross-origin requests are not allowed.");
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (isApi) return jsonError(401, "Your session has expired. Please sign in again.");
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(login);
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (isApi) {
    if (!canAccessApi(session.role, pathname, request.method)) {
      return jsonError(403, "You do not have permission to perform this action.");
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
  }

  if (!canAccessPage(session.role, pathname)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
