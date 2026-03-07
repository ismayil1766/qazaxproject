import { NextResponse } from "next/server";
import { parseCookieHeader } from "@/lib/adminAuth";
import { getFlowCookieName, isFlowCookieValid } from "@/lib/adminLoginFlow";
import { prisma } from "@/lib/db";
import { decryptSecret, verifyTotp, generateRecoveryCodes, hashRecoveryCodes } from "@/lib/mfa";
import { rateLimit, getIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = rateLimit(`admin:confirm:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const flow = cookies[getFlowCookieName()];
  if (!isFlowCookieValid(flow)) return NextResponse.json({ ok: false, error: "Sessiya bitib. Yenidən giriş edin." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.code || "").trim();

  if (!/^\d{6}$/.test(token)) return NextResponse.json({ ok: false, error: "Kod 6 rəqəm olmalıdır." }, { status: 400 });

  const mfa = await prisma.adminMfa.findUnique({ where: { id: 1 } });
  if (!mfa?.totpSecretEnc) return NextResponse.json({ ok: false, error: "Setup tapılmadı. Yenidən giriş edin." }, { status: 400 });

  const secret = decryptSecret(mfa.totpSecretEnc);
  const ok = verifyTotp({ token, secret });
  if (!ok) return NextResponse.json({ ok: false, error: "Authenticator kodu yanlışdır." }, { status: 401 });

  const recovery = generateRecoveryCodes(10);
  const hashes = await hashRecoveryCodes(recovery);

  await prisma.adminMfa.update({
    where: { id: 1 },
    data: {
      mfaEnabled: true,
      totpConfirmedAt: new Date(),
      recoveryCodesHash: JSON.stringify(hashes),
      recoveryCodesCreatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, step: "RECOVERY_CODES", recoveryCodes: recovery });
}
