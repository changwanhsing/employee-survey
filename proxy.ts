import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_SESSION_COOKIE = "admin_session";

async function verifyAdminToken(token: string): Promise<boolean> {
  const raw = process.env.ADMIN_SECRET ?? process.env.SESSION_SECRET;
  if (!raw) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(raw));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi =
    (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login" && pathname !== "/api/admin/logout") ||
    pathname.startsWith("/api/employees") ||
    pathname === "/api/submit/export" ||
    (pathname === "/api/submit" && request.method === "GET") ||
    pathname === "/api/survey-config/upload-image";

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token && (await verifyAdminToken(token))) {
    return NextResponse.next();
  }

  if (isAdminPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.json({ error: "未授權，請先登入後台" }, { status: 401 });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/employees/:path*",
    "/api/submit",
    "/api/submit/export",
    "/api/survey-config/upload-image",
  ],
};
