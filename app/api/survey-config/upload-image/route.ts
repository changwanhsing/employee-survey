import { NextResponse } from "next/server";
import { supabase } from "../../../../src/lib/supabase";

const BUCKET = "survey-images";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function matchesMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    );
  }
  if (mimeType === "image/gif") {
    return (
      buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
    );
  }
  if (mimeType === "image/webp") {
    return (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    );
  }
  return false;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "未提供檔案" }, { status: 400 });
  }
  if (!(file.type in ALLOWED_TYPES)) {
    return NextResponse.json(
      { ok: false, error: "只接受 JPG、PNG、GIF、WebP 格式（不支援 SVG）" },
      { status: 400 },
    );
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "圖片大小不可超過 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagicBytes(buffer, file.type)) {
    return NextResponse.json({ ok: false, error: "檔案內容與格式不符" }, { status: 400 });
  }

  // 確保 bucket 存在（若已存在會靜默忽略）
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = ALLOWED_TYPES[file.type];
  const filename = `item-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "上傳失敗，請稍後再試。" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
