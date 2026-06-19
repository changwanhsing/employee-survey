import { NextResponse } from "next/server";
import { getSurveyConfig, isConfigDeadlinePassed } from "../../../src/lib/surveyConfig";
import { getDeadline, isDeadlinePassed } from "../../../src/config/deadline";

export async function GET() {
  const config = await getSurveyConfig();

  if (config.deadline) {
    return NextResponse.json({
      deadline: config.deadline,
      expired: isConfigDeadlinePassed(config),
    });
  }

  // 降級到環境變數
  const deadline = getDeadline();
  return NextResponse.json({
    deadline: deadline ? deadline.toISOString() : null,
    expired: isDeadlinePassed(),
  });
}
