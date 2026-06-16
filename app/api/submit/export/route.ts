import { readFile } from "fs/promises";
import path from "path";
import { mooncakeItems } from "../../../../src/data/mooncakeItems";

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

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const submissions = await readSubmissions();
  const itemNameById = new Map(mooncakeItems.map((item) => [item.id, item.name]));

  const header = ["工號", "姓名", "部門", "選擇品項", "送出時間"];
  const rows = submissions.map((submission) => {
    const items = submission.items
      .map((entry) => `${itemNameById.get(entry.itemId) ?? entry.itemId} x${entry.quantity}`)
      .join("、");
    return [
      submission.employeeId,
      submission.name,
      submission.department,
      items,
      submission.submittedAt,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions.csv"`,
    },
  });
}
