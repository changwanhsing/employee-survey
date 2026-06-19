import { NextResponse } from "next/server";
import { activateSurvey } from "../../../../../../src/lib/surveyConfig";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await activateSurvey(id);
  return NextResponse.json({ ok: true });
}
