import { NextResponse } from "next/server";
import { listSurveys, createSurvey } from "../../../../src/lib/surveyConfig";

export async function GET() {
  const surveys = await listSurveys();
  return NextResponse.json({ surveys });
}

export async function POST(request: Request) {
  const body = await request.json();
  const surveyName = String(body.surveyName ?? "").trim();
  if (!surveyName) {
    return NextResponse.json({ ok: false, error: "請輸入活動名稱" }, { status: 400 });
  }
  const id = await createSurvey(surveyName);
  if (!id) {
    return NextResponse.json({ ok: false, error: "建立失敗" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id });
}
