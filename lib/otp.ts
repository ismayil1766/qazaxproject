import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

export function generateOtpCode(): string {
  // 6 rəqəm
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export function hashOtp(code: string): string {
  const secret = process.env.OTP_SECRET || "dev-otp-secret";
  return crypto.createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

export function getOtpTtlMs() {
  const m = Number(process.env.OTP_TTL_MINUTES || "10");
  return Math.max(3, Math.min(60, m)) * 60 * 1000;
}

export function getOtpResendSeconds() {
  const s = Number(process.env.OTP_RESEND_SECONDS || "90");
  // 30s - 10min arası məntiqli limit
  return Math.max(30, Math.min(600, s));
}


export async function issueOtp(args: {
  email: string;
  userId?: string | null;
  purpose: "LOGIN" | "VERIFY_EMAIL" | "RESET_PASSWORD" | "ADMIN_LOGIN";
}) {
  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + getOtpTtlMs());

  // Resend limiti (məs: 90 saniyə)
  const resendSeconds = getOtpResendSeconds();
  const last = await prisma.emailOtp.findFirst({
    where: { email: args.email, purpose: args.purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last) {
    const diffMs = Date.now() - last.createdAt.getTime();
    if (diffMs < resendSeconds * 1000) {
      const left = Math.ceil((resendSeconds * 1000 - diffMs) / 1000);
      throw new Error(`Kod artıq göndərilib. ${left} saniyə sonra yenidən cəhd edin.`);
    }
  }


  // Köhnələri yararsız et (sadə cleanup)
  await prisma.emailOtp.updateMany({
    where: { email: args.email, purpose: args.purpose, usedAt: null },
    data: { usedAt: new Date() },
  }).catch(() => {});

  await prisma.emailOtp.create({
    data: {
      email: args.email,
      userId: args.userId ?? null,
      codeHash,
      purpose: args.purpose,
      expiresAt,
    },
  });

  const subject = args.purpose === "ADMIN_LOGIN" ? "Admin giriş — OTP kodu" : "Şəhər Elanları — təsdiqləmə kodu";
  const text = `Sizin birdəfəlik kodunuz: ${code}\n\nKod ${Math.round(getOtpTtlMs() / 60000)} dəqiqə etibarlıdır.`;
  const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.5">
    <h2>Şəhər Elanları</h2>
    <p>Təsdiqləmə kodunuz:</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:3px">${code}</div>
    <p style="color:#555">Kod ${Math.round(getOtpTtlMs() / 60000)} dəqiqə etibarlıdır.</p>
  </div>`;

  await sendEmail({ to: args.email, subject, text, html });
  return { expiresAt };
}

export async function consumeOtp(args: {
  email: string;
  code: string;
  purpose: "LOGIN" | "VERIFY_EMAIL" | "RESET_PASSWORD" | "ADMIN_LOGIN";
}) {
  const codeHash = hashOtp(args.code);
  const now = new Date();

  const otp = await prisma.emailOtp.findFirst({
    where: {
      email: args.email,
      purpose: args.purpose,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false } as const;

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { usedAt: now },
  });

  return { ok: true, userId: otp.userId ?? null } as const;
}
