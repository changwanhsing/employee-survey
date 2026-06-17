type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend 免費測試寄件人；正式寄信請改成已驗證網域的位址。
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

/**
 * 寄送一封信。
 * - 有設定 RESEND_API_KEY → 透過 Resend REST API 寄出（免裝套件）。
 * - 沒設定 → 開發模式，僅印到 console，讓流程在無金鑰時仍可跑通。
 * 回傳是否成功；呼叫端可忽略失敗，不應因寄信失敗而中斷主要流程。
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.info(
      `[mailer:dev] 未設定 RESEND_API_KEY，略過實際寄信。\n` +
        `  收件者：${message.to}\n  主旨：${message.subject}`,
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[mailer] Resend 回應 ${response.status}：${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[mailer] 寄信失敗：", error);
    return false;
  }
}
