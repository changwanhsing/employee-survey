import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { mapRowsToEmployees } from "../../../../src/lib/employeeImport";
import { supabase } from "../../../../src/lib/supabase";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "請以檔案上傳格式送出。" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "未收到檔案。" },
      { status: 400 },
    );
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  } catch {
    return NextResponse.json(
      { ok: false, error: "無法解析檔案，請確認是有效的 Excel（.xlsx）或 CSV。" },
      { status: 400 },
    );
  }

  const result = mapRowsToEmployees(rows);

  if (result.employees.length === 0) {
    return NextResponse.json(
      { ok: false, error: "沒有可匯入的有效資料。", details: result.errors },
      { status: 422 },
    );
  }

  const insertRows = result.employees.map((emp) => ({
    employee_id: emp.employeeId,
    name: emp.name,
    department: emp.department,
    email: emp.email ?? null,
  }));

  const { error: deleteError } = await supabase
    .from("employees")
    .delete()
    .neq("employee_id", "");

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: "清除舊資料失敗：" + deleteError.message },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabase
    .from("employees")
    .insert(insertRows);

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "資料庫寫入失敗：" + insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    imported: result.employees.length,
    mapping: result.mapping,
    warnings: result.errors,
  });
}
