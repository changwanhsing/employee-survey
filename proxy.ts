import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "./src/lib/session";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

function unauthorized() {
  return new NextResponse("請輸入管理者帳號密碼", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /survey with session cookie
  if (pathname === "/survey") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.redirect(new URL("/", request.url));
    const session = await verifySession(token);
    if (!session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Admin routes: Basic Auth
  if (pathname === "/api/submit" && request.method !== "GET") {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (user !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/survey",
    "/admin",
    "/api/submit",
    "/api/submit/export",
    "/api/employees",
    "/api/employees/import",
  ],
};
