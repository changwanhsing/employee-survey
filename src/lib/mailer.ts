import nodemailer from "nodemailer";

type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER || "noreply@example.com";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.info(
      `[mailer:dev] 未設定 GMAIL_USER / GMAIL_APP_PASSWORD，略過實際寄信。\n` +
        `  收件者：${message.to}\n  主旨：${message.subject}`,
    );
    return false;
  }

  try {
    await transport.sendMail({
      from: `調查系統 <${EMAIL_FROM}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    return true;
  } catch (error) {
    console.error("[mailer] 寄信失敗：", error);
    return false;
  }
}
