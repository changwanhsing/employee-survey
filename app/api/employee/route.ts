import { NextResponse } from "next/server";
import { employees } from "../../../src/data/employees";

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();
  const employee = employees.find(
    (item) => item.employeeId.toUpperCase() === employeeId,
  );

  if (!employee) {
    return NextResponse.json(
      {
        found: false,
        error: "找不到此工號,請確認後重新輸入",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ found: true, employee });
}
