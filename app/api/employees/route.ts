import { NextResponse } from "next/server";
import { getEmployees } from "../../../src/data/employees";
import { supabase } from "../../../src/lib/supabase";

export async function GET() {
  const employees = await getEmployees();
  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body.employeeId ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const department = String(body.department ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!employeeId || !name || !department || !email) {
    return NextResponse.json({ ok: false, error: "工號、姓名、部門、Email 皆為必填" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email 格式不正確" }, { status: 400 });
  }

  const { error } = await supabase.from("employees").insert({
    employee_id: employeeId,
    name,
    department,
    email,
  });

  if (error) {
    const msg = error.code === "23505" ? "此工號已存在" : "新增失敗，請稍後再試";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
