import { NextResponse } from "next/server";
import { getEmployees } from "../../../../src/data/employees";
import { supabase } from "../../../../src/lib/supabase";
import { signSession, SESSION_COOKIE } from "../../../../src/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();
  const code = String(body.code || "").trim();

  if (!employeeId || !code) {
    return NextResponse.json({ ok: false, error: "缺少必要欄位" }, { status: 400 });
  }

  const { data: otp, error } = await supabase
    .from("otps")
    .select("code, expires_at")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !otp) {
    return NextResponse.json(
      { ok: false, error: "驗證碼不存在，請重新發送。" },
      { status: 400 },
    );
  }

  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, error: "驗證碼已過期，請重新發送。" },
      { status: 400 },
    );
  }

  if (otp.code !== code) {
    return NextResponse.json(
      { ok: false, error: "驗證碼不正確，請再試一次。" },
      { status: 400 },
    );
  }

  // Delete used OTP
  await supabase.from("otps").delete().eq("employee_id", employeeId);

  const employees = await getEmployees();
  const employee = employees.find(
    (e) => e.employeeId.toUpperCase() === employeeId,
  );

  if (!employee) {
    return NextResponse.json({ ok: false, error: "員工資料不存在。" }, { status: 404 });
  }

  const token = await signSession({
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department,
  });

  const response = NextResponse.json({ ok: true });
  // Session-only cookie (no expires/max-age) so browser close clears it.
  // JWT exp handles the 5-minute server-side timeout.
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
