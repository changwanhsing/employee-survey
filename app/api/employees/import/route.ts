import { NextResponse } from "next/server";
import { mkdir, rename, writeFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import {
  employeesToCsv,
  mapRowsToEmployees,
} from "../../../../src/lib/employeeImport";

const dataDir = path.join(process.cwd(), "data");
const csvFile = path.join(dataDir, "employees.csv");

async function writeCsv(content: string) {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${csvFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, content, "utf-8");
  await rename(tempFile, csvFile);
}

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

  await writeCsv(employeesToCsv(result.employees));

  return NextResponse.json({
    ok: true,
    imported: result.employees.length,
    mapping: result.mapping,
    warnings: result.errors,
  });
}
