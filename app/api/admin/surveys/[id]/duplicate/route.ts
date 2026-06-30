import { NextResponse } from "next/server";
import { duplicateSurvey } from "../../../../../../src/lib/surveyConfig";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const newId = await duplicateSurvey(id);
  if (!newId) return NextResponse.json({ ok: false, error: "複製失敗" }, { status: 500 });
  return NextResponse.json({ ok: true, id: newId });
}
