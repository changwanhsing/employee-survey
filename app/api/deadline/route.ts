import { NextResponse } from "next/server";
import { getDeadline, isDeadlinePassed } from "../../../src/config/deadline";

export async function GET() {
  const deadline = getDeadline();
  return NextResponse.json({
    deadline: deadline ? deadline.toISOString() : null,
    expired: isDeadlinePassed(),
  });
}
