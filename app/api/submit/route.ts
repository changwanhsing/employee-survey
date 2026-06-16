import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { mooncakeItems } from "../../../src/data/mooncakeItems";
import { isDeadlinePassed } from "../../../src/config/deadline";
import { getEmployees } from "../../../src/data/employees";
import { clientKey, rateLimit } from "../../../src/lib/rateLimit";

type Submission = {
  employeeId: string;
  name: string;
  department: string;
  items: { itemId: string; quantity: number }[];
  submittedAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "submissions.json");

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
  await writeFile(dataFile, JSON.stringify(submissions, null, 2), "utf-8");
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

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const submissions = await readSubmissions();
  return NextResponse.json({ submissions });
}
