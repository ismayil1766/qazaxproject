import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashOtp } from "@/lib/otp";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { getAdminMfa } from "@/lib/adminMfaStore";
import { parseCookieHeader } from "@/lib/adminAuth";
import { getFlowCookieName, isFlowCookieValid } from "@/lib/adminLoginFlow";
import { decryptSecret, generateTotpSecret, encryptSecret, otpauthUrl } from "@/lib/mfa";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = rateLimit(`admin:email:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const flow = cookies[getFlowCookieName()];
  if (!isFlowCookieValid(flow)) return NextResponse.json({ ok: false, error: "Sessiya bitib. Yenidən giriş edin." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim();

  if (!/^\d{6}$/.test(code)) return NextResponse.json({ ok: false, error: "OTP 6 rəqəm olmalıdır." }, { status: 400 });

  const mfa = await getAdminMfa();
  const codeHash = hashOtp(code);

  const row = await prisma.emailOtp.findFirst({
    where: { email: mfa.email, purpose: "ADMIN_LOGIN", usedAt: null, expiresAt: { gt: new Date() }, codeHash },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!row) return NextResponse.json({ ok: false, error: "Kod yanlışdır və ya vaxtı bitib." }, { status: 401 });

  await prisma.emailOtp.update({ where: { id: row.id }, data: { usedAt: new Date() } }).catch(() => {});

  // MFA enabled -> next step: TOTP / recovery
  if (mfa.mfaEnabled && mfa.totpSecretEnc) {
    return NextResponse.json({ ok: true, step: "TOTP" });
  }

  // Setup flow
  // Create secret if missing
  let secret = "";
  if (mfa.totpSecretEnc) {
    try { secret = decryptSecret(mfa.totpSecretEnc); } catch { secret = ""; }
  }
  if (!secret) {
    secret = generateTotpSecret();
    await prisma.adminMfa.update({
      where: { id: 1 },
      data: { totpSecretEnc: encryptSecret(secret) },
    });
  }

  const fresh = await prisma.adminMfa.findUnique({ where: { id: 1 } });
  if (fresh?.totpSetupViewedAt) {
    // QR already shown once; do not show again.
    return NextResponse.json({ ok: true, step: "SETUP_LOCKED" });
  }

  const url = otpauthUrl({ email: mfa.email, secret });
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });

  await prisma.adminMfa.update({ where: { id: 1 }, data: { totpSetupViewedAt: new Date() } });

  return NextResponse.json({ ok: true, step: "SETUP_TOTP", qrDataUrl, otpauthUrl: url });
}
