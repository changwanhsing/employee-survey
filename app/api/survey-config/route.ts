import { NextResponse } from "next/server";
import { getSurveyConfig } from "../../../src/lib/surveyConfig";

export async function GET() {
  const config = await getSurveyConfig();
  return NextResponse.json(config);
}
