import { NextResponse } from "next/server";
import { getEmployees } from "../../../src/data/employees";
import { clientKey, rateLimit } from "../../../src/lib/rateLimit";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "employee-lookup"), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { found: false, error: "嘗試次數過多，請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const employees = await getEmployees();
  const employee = employees.find(
    (item) => item.employeeId.toUpperCase() === employeeId,
  );

  if (!employee || employee.name !== name) {
    return NextResponse.json(
      {
        found: false,
        error: "工號或姓名不正確,請確認後重新輸入",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ found: true, employee });
}
