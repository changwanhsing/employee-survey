import { NextResponse } from "next/server";
import { getEmployees } from "../../../../src/data/employees";
import { clientKey, rateLimit } from "../../../../src/lib/rateLimit";
import { sendMail } from "../../../../src/lib/mailer";
import { supabase } from "../../../../src/lib/supabase";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const masked = local.length <= 2
    ? local[0] + "*".repeat(local.length - 1)
    : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

export async function POST(request: Request) {
  const ipLimit = rateLimit(clientKey(request, "otp-send"), 10, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "嘗試次數過多，請稍後再試。" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json();
  const employeeId = String(body.employeeId || "").trim().toUpperCase();

  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "請輸入員工工號" }, { status: 400 });
  }

  const employees = await getEmployees();
  const employee = employees.find((e) => e.employeeId.toUpperCase() === employeeId);

  if (!employee) {
    return NextResponse.json(
      { ok: false, error: "找不到此工號，請確認後重新輸入。" },
      { status: 404 },
    );
  }

  if (!employee.email) {
    return NextResponse.json(
      { ok: false, error: "您的帳號尚未設定 Email，請聯絡 HR。" },
      { status: 422 },
    );
  }

  // Rate limit: 1 OTP per minute per employee
  const { data: existing } = await supabase
    .from("otps")
    .select("sent_at")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (existing) {
    const sentAt = new Date(existing.sent_at).getTime();
    const elapsed = Date.now() - sentAt;
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { ok: false, error: `請等待 ${retryAfter} 秒後再重新發送。` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  const code = generateOtp();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error: upsertError } = await supabase.from("otps").upsert(
    { employee_id: employeeId, code, expires_at: expiresAt, sent_at: now },
    { onConflict: "employee_id" },
  );

  if (upsertError) {
    return NextResponse.json(
      { ok: false, error: "系統錯誤，請稍後再試。" },
      { status: 500 },
    );
  }

  await sendMail({
    to: employee.email,
    subject: "中秋月餅調查 — 驗證碼",
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>您的驗證碼</h2>
        <p>${employee.name} 您好，</p>
        <p>請在 10 分鐘內輸入以下驗證碼：</p>
        <p style="font-size: 36px; font-weight: bold; letter-spacing: 0.3em; color: #1e293b;">${code}</p>
        <p style="color:#64748b; font-size:13px;">如非本人操作，請忽略此信。</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, maskedEmail: maskEmail(employee.email) });
}
