import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { signAdminSession, ADMIN_SESSION_COOKIE } from "../../../../src/lib/adminSession";

export async function POST(request: Request) {
  const body = await request.json();
  const password = String(body.password ?? "");

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "後台密碼未設定，請聯絡系統管理員" },
      { status: 500 },
    );
  }

  const inputBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  const valid =
    inputBuf.length === expectedBuf.length &&
    timingSafeEqual(inputBuf, expectedBuf);

  if (!valid) {
    return NextResponse.json({ ok: false, error: "密碼錯誤" }, { status: 401 });
  }

  const token = await signAdminSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}
