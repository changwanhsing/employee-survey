import { supabase } from "./supabase";

export type SurveyItem = {
  id: string;
  name: string;
  description: string;
  maxQuantity: number;
  imageUrl?: string;
};

export type SurveyConfig = {
  title: string;
  items: SurveyItem[];
  deadline: string | null;
  selectionType?: "single" | "multiple";
};

export type SurveyMeta = {
  id: string;
  surveyName: string;
  title: string;
  isActive: boolean;
  updatedAt: string | null;
};

const DEFAULT_CONFIG: SurveyConfig = {
  title: "員工調查",
  items: [],
  deadline: null,
};

/** 員工端用：取得目前上架的調查設定 */
export async function getSurveyConfig(): Promise<SurveyConfig> {
  const { data, error } = await supabase
    .from("survey_config")
    .select("title, items, deadline, selection_type")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) return DEFAULT_CONFIG;

  return {
    title: typeof data.title === "string" ? data.title : DEFAULT_CONFIG.title,
    items: Array.isArray(data.items) ? (data.items as SurveyItem[]) : [],
    deadline: data.deadline ?? null,
    selectionType: data.selection_type === "single" ? "single" : "multiple",
  };
}

/** 管理端：列出所有活動 */
export async function listSurveys(): Promise<SurveyMeta[]> {
  const { data, error } = await supabase
    .from("survey_config")
    .select("id, survey_name, title, is_active, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    surveyName: row.survey_name ?? "",
    title: row.title ?? "",
    isActive: row.is_active ?? false,
    updatedAt: row.updated_at ?? null,
  }));
}

/** 管理端：取得單一活動（含完整設定） */
export async function getSurveyById(
  id: string,
): Promise<(SurveyConfig & { surveyName: string }) | null> {
  const { data, error } = await supabase
    .from("survey_config")
    .select("survey_name, title, items, deadline, selection_type")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    surveyName: data.survey_name ?? "",
    title: data.title ?? "",
    items: Array.isArray(data.items) ? (data.items as SurveyItem[]) : [],
    deadline: data.deadline ?? null,
    selectionType: data.selection_type === "single" ? "single" : "multiple",
  };
}

/** 管理端：新增活動 */
export async function createSurvey(surveyName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("survey_config")
    .insert({
      id: crypto.randomUUID(),
      survey_name: surveyName,
      title: surveyName,
      items: [],
      deadline: null,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

/** 管理端：更新活動設定 */
export async function updateSurvey(
  id: string,
  update: Partial<{
    surveyName: string;
    title: string;
    items: SurveyItem[];
    deadline: string | null;
    selectionType: "single" | "multiple";
  }>,
): Promise<void> {
  const dbUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (update.surveyName !== undefined) dbUpdate.survey_name = update.surveyName;
  if (update.title !== undefined) dbUpdate.title = update.title;
  if (update.items !== undefined) dbUpdate.items = update.items;
  if ("deadline" in update) dbUpdate.deadline = update.deadline;
  if (update.selectionType !== undefined) dbUpdate.selection_type = update.selectionType;
  await supabase.from("survey_config").update(dbUpdate).eq("id", id);
}

/** 管理端：上架指定活動（其他全部下架） */
export async function activateSurvey(id: string): Promise<void> {
  await supabase.from("survey_config").update({ is_active: false }).neq("id", id);
  await supabase.from("survey_config").update({ is_active: true }).eq("id", id);
}

/** 管理端：刪除活動 */
export async function deleteSurvey(id: string): Promise<void> {
  await supabase.from("survey_config").delete().eq("id", id);
}

export function isConfigDeadlinePassed(config: SurveyConfig): boolean {
  if (!config.deadline) return false;
  return Date.now() > new Date(config.deadline).getTime();
}
