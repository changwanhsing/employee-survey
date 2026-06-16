import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

type Submission = {
  employeeId: string;
  name: string;
  department: string;
  items: { itemId: string; quantity: number }[];
  submittedAt: string;
};

const dataFile = path.join(process.cwd(), "data", "submissions.json");

async function readSubmissions(): Promise<Submission[]> {
  try {
    const raw = await readFile(dataFile, "utf-8");
    return JSON.parse(raw) as Submission[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const employeeId = (request.nextUrl.searchParams.get("employeeId") || "")
    .trim()
    .toUpperCase();

  if (!employeeId) {
    return NextResponse.json({ submitted: false });
  }

  const submissions = await readSubmissions();
  const existing = submissions.find((item) => item.employeeId === employeeId);

  if (!existing) {
    return NextResponse.json({ submitted: false });
  }

  return NextResponse.json({
    submitted: true,
    items: existing.items,
    submittedAt: existing.submittedAt,
  });
}
