import * as XLSX from "xlsx";
import { supabase } from "../../../../src/lib/supabase";
import { getSurveyConfig } from "../../../../src/lib/surveyConfig";

export async function GET() {
  const [{ data, error }, config] = await Promise.all([
    supabase.from("submissions").select("employee_id, name, department, items, submitted_at"),
    getSurveyConfig(),
  ]);

  if (error) {
    return new Response("無法取得資料", { status: 500 });
  }

  const itemNameById = new Map(config.items.map((item) => [item.id, item.name]));

  const rows = (data ?? []).map((row) => {
    const items = (row.items as { itemId: string; quantity: number }[])
      .map((entry) => `${itemNameById.get(entry.itemId) ?? entry.itemId} x${entry.quantity}`)
      .join("、");
    return {
      工號: row.employee_id,
      姓名: row.name,
      部門: row.department,
      選擇品項: items,
      送出時間: row.submitted_at,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "調查結果");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="survey_results.xlsx"`,
    },
  });
}
