import { NextResponse } from "next/server";
import { getEmployees } from "../../../src/data/employees";

export async function GET() {
  const employees = await getEmployees();
  return NextResponse.json({ employees });
}
