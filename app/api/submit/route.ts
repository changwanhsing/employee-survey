import { NextResponse } from "next/server";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { mooncakeItems } from "../../../src/data/mooncakeItems";
import { isDeadlinePassed } from "../../../src/config/deadline";
import { getEmployees } from "../../../src/data/employees";
import { clientKey, rateLimit } from "../../../src/lib/rateLimit";
import { Mutex } from "../../../src/lib/mutex";
import { sendMail } from "../../../src/lib/mailer";

function renderConfirmationEmail(
  name: string,
  department: string,
  items: { itemId: string; quantity: number }[],
): string {
  const itemNameById = new Map(mooncakeItems.map((item) => [item.id, item.name]));
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
      <h2>中秋月餅調查 — 送出確認</h2>
      <p>${name}（${department}）您好，我們已收到您的選擇：</p>
      ${listHtml}
      <p style="color:#64748b; font-size:13px;">如需修改，請於收件截止前重新登入調整。此信為系統自動發送，請勿直接回覆。</p>
    </div>
  `;
}

type Submission = {
  employeeId: string;
  name: string;
  department: string;
  items: { itemId: string; quantity: number }[];
  submittedAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "submissions.json");

// Serialize the read-modify-write of submissions.json so concurrent submits
// within this process don't overwrite each other.
const submissionsMutex = new Mutex();

async function readSubmissions(): Promise<Submission[]> {
  try {
    const raw = await readFile(dataFile, "utf-8");
    return JSON.parse(raw) as Submission[];
  } catch {
    return [];
  }
}

async function writeSubmissions(submissions: Submission[]) {
  await mkdir(dataDir, { recursive: true });
  // Write to a temp file then rename so a crash mid-write can't corrupt the
  // file or expose a half-written JSON to concurrent readers.
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(submissions, null, 2), "utf-8");
  await rename(tempFile, dataFile);
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "submit"), 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "嘗試次數過多，請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (isDeadlinePassed()) {
    return NextResponse.json(
      { ok: false, error: "已超過收件期限，無法送出" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const quantities = body.quantities as Record<string, number> | undefined;

  if (!employeeId || !name || !quantities) {
    return NextResponse.json(
      { ok: false, error: "缺少必要欄位" },
      { status: 400 },
    );
  }

  // 以伺服器端的員工名冊為準，避免前端竄改身份或部門
  const employees = await getEmployees();
  const employee = employees.find(
    (item) => item.employeeId.toUpperCase() === employeeId && item.name === name,
  );

  if (!employee) {
    return NextResponse.json(
      { ok: false, error: "工號或姓名不正確，無法送出" },
      { status: 403 },
    );
  }

  const department = employee.department;

  const validItemIds = new Set(mooncakeItems.map((item) => item.id));
  const items = Object.entries(quantities)
    .filter(([itemId, quantity]) => validItemIds.has(itemId) && quantity > 0)
    .map(([itemId, quantity]) => ({
      itemId,
      quantity: Math.min(5, Math.max(0, Math.trunc(quantity))),
    }));

  const submission: Submission = {
    employeeId,
    name,
    department,
    items,
    submittedAt: new Date().toISOString(),
  };

  await submissionsMutex.runExclusive(async () => {
    const submissions = await readSubmissions();
    const existingIndex = submissions.findIndex(
      (item) => item.employeeId === employeeId,
    );
    if (existingIndex >= 0) {
      submissions[existingIndex] = submission;
    } else {
      submissions.push(submission);
    }
    await writeSubmissions(submissions);
  });

  // 寄送確認信（有 email 才寄）。寄信失敗不影響送出結果。
  if (employee.email) {
    await sendMail({
      to: employee.email,
      subject: "中秋月餅調查 — 送出確認",
      html: renderConfirmationEmail(employee.name, department, items),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const submissions = await readSubmissions();
  return NextResponse.json({ submissions });
}
