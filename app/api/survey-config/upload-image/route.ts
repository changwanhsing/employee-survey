import { NextResponse } from "next/server";
import { supabase } from "../../../../src/lib/supabase";

const BUCKET = "survey-images";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "未提供檔案" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "只接受圖片檔案" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "圖片大小不可超過 2MB" }, { status: 400 });
  }

  // 確保 bucket 存在（若已存在會靜默忽略）
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `item-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "上傳失敗，請稍後再試。" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
