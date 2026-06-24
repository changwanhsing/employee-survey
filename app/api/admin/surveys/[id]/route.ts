import { NextResponse } from "next/server";
import { getSurveyById, updateSurvey, deleteSurvey } from "../../../../../src/lib/surveyConfig";
import type { SurveyItem } from "../../../../../src/lib/surveyConfig";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await getSurveyById(id);
  if (!survey) return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  return NextResponse.json(survey);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const update: Parameters<typeof updateSurvey>[1] = {};
  if (typeof body.surveyName === "string") update.surveyName = body.surveyName.trim();
  if (typeof body.title === "string") update.title = body.title.trim();
  if (Array.isArray(body.items)) {
    update.items = (body.items as SurveyItem[])
      .map((item) => ({
        id: String(item.id ?? "").trim(),
        name: String(item.name ?? "").trim(),
        description: String(item.description ?? "").trim(),
        maxQuantity: Math.max(1, Math.trunc(Number(item.maxQuantity) || 5)),
        ...(item.imageUrl ? { imageUrl: String(item.imageUrl) } : {}),
        ...(item.selectionType === "single" || item.selectionType === "multiple"
          ? { selectionType: item.selectionType }
          : {}),
      }))
      .filter((item) => item.id && item.name);
  }
  if ("deadline" in body) update.deadline = body.deadline || null;

  await updateSurvey(id, update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSurvey(id);
  return NextResponse.json({ ok: true });
}
