import { supabase } from "../../../../src/lib/supabase";
import { getSurveyConfig } from "../../../../src/lib/surveyConfig";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const [{ data, error }, config] = await Promise.all([
    supabase.from("submissions").select("employee_id, name, department, items, submitted_at"),
    getSurveyConfig(),
  ]);

  if (error) {
    return new Response("無法取得資料", { status: 500 });
  }

  const itemNameById = new Map(config.items.map((item) => [item.id, item.name]));

  const header = ["工號", "姓名", "部門", "選擇品項", "送出時間"];
  const rows = (data ?? []).map((row) => {
    const items = (row.items as { itemId: string; quantity: number }[])
      .map((entry) => `${itemNameById.get(entry.itemId) ?? entry.itemId} x${entry.quantity}`)
      .join("、");
    return [row.employee_id, row.name, row.department, items, row.submitted_at];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions.csv"`,
    },
  });
}
