import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSurveyConfig, isConfigDeadlinePassed } from "../../../src/lib/surveyConfig";
import { isDeadlinePassed } from "../../../src/config/deadline";
import { getEmployees } from "../../../src/data/employees";
import { clientKey, rateLimit } from "../../../src/lib/rateLimit";
import { sendMail } from "../../../src/lib/mailer";
import { supabase } from "../../../src/lib/supabase";
import { verifySession, SESSION_COOKIE } from "../../../src/lib/session";

function renderConfirmationEmail(
  name: string,
  department: string,
  surveyTitle: string,
  items: { itemId: string; quantity: number }[],
  itemNameById: Map<string, string>,
): string {
  const listHtml =
    items.length === 0
      ? "<p>您本次未選擇任何品項。</p>"
      : `<ul>${items
          .map(
            (entry) =>
              `<li>${itemNameById.get(entry.itemId) ?? entry.itemId} × ${entry.quantity}</li>`,
          )
          .join("")}</ul>`;

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>${surveyTitle} — 送出確認</h2>
      <p>${name}（${department}）您好，我們已收到您的選擇：</p>
      ${listHtml}
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">重新填寫調查表</a></p>
      <p style="color:#64748b; font-size:13px;">如需修改，請於收件截止前點上方連結重新登入調整。此信為系統自動發送，請勿直接回覆。</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "submit"), 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "嘗試次數過多，請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "請先完成身分驗證" },
      { status: 401 },
    );
  }

  const config = await getSurveyConfig();

  const deadlinePassed = config.deadline
    ? isConfigDeadlinePassed(config)
    : isDeadlinePassed();

  if (deadlinePassed) {
    return NextResponse.json(
      { ok: false, error: "已超過收件期限，無法送出" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const quantities = body.quantities as Record<string, number> | undefined;

  if (!quantities) {
    return NextResponse.json(
      { ok: false, error: "缺少必要欄位" },
      { status: 400 },
    );
  }

  // Use identity from verified session — do not trust request body for employeeId/name
  const employeeId = session.employeeId.toUpperCase();

  const employees = await getEmployees();
  const employee = employees.find(
    (item) => item.employeeId.toUpperCase() === employeeId,
  );

  if (!employee) {
    return NextResponse.json(
      { ok: false, error: "員工資料不存在，無法送出" },
      { status: 403 },
    );
  }

  const department = employee.department;

  const itemMap = new Map(config.items.map((item) => [item.id, item]));
  const items = Object.entries(quantities)
    .filter(([itemId, quantity]) => itemMap.has(itemId) && quantity > 0)
    .map(([itemId, quantity]) => {
      const maxQty = itemMap.get(itemId)!.maxQuantity;
      return {
        itemId,
        quantity: Math.min(maxQty, Math.max(0, Math.trunc(quantity))),
      };
    });

  const { error } = await supabase.from("submissions").upsert(
    {
      employee_id: employeeId,
      name,
      department,
      items,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: "資料儲存失敗，請稍後再試。" },
      { status: 500 },
    );
  }

  if (employee.email) {
    const itemNameById = new Map(config.items.map((item) => [item.id, item.name]));
    await sendMail({
      to: employee.email,
      subject: `${config.title} — 送出確認`,
      html: renderConfirmationEmail(employee.name, department, config.title, items, itemNameById),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { data, error } = await supabase
    .from("submissions")
    .select("employee_id, name, department, items, submitted_at");

  if (error) {
    return NextResponse.json({ submissions: [] });
  }

  const submissions = (data ?? []).map((row) => ({
    employeeId: row.employee_id,
    name: row.name,
    department: row.department,
    items: row.items,
    submittedAt: row.submitted_at,
  }));

  return NextResponse.json({ submissions });
}
