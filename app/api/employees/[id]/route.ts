import { NextResponse } from "next/server";
import { supabase } from "../../../../src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const department = String(body.department ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!name || !department || !email) {
    return NextResponse.json({ ok: false, error: "姓名、部門、Email 皆為必填" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email 格式不正確" }, { status: 400 });
  }

  const { error } = await supabase
    .from("employees")
    .update({ name, department, email })
    .eq("employee_id", id.toUpperCase());

  if (error) {
    return NextResponse.json({ ok: false, error: "更新失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("employee_id", id.toUpperCase());

  if (error) {
    return NextResponse.json({ ok: false, error: "刪除失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
