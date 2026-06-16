import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { mooncakeItems } from "../../../src/data/mooncakeItems";

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
  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const department = String(body.department || "").trim();
  const quantities = body.quantities as Record<string, number> | undefined;

  if (!employeeId || !name || !department || !quantities) {
    return NextResponse.json(
      { ok: false, error: "缺少必要欄位" },
      { status: 400 },
    );
  }

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
