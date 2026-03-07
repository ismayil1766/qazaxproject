import { NextResponse } from "next/server";
import { parseCookieHeader, getAdminCookieName, makeAdminCookieValue, adminUser } from "@/lib/adminAuth";
import { getFlowCookieName, isFlowCookieValid } from "@/lib/adminLoginFlow";
import { prisma } from "@/lib/db";
import { decryptSecret, verifyTotp, consumeRecoveryCode } from "@/lib/mfa";
import { rateLimit, getIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = rateLimit(`admin:totp:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const flow = cookies[getFlowCookieName()];
  if (!isFlowCookieValid(flow)) return NextResponse.json({ ok: false, error: "Sessiya bitib. Yenidən giriş edin." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim();

  const mfa = await prisma.adminMfa.findUnique({ where: { id: 1 } });
  if (!mfa?.mfaEnabled) return NextResponse.json({ ok: false, error: "MFA aktiv deyil." }, { status: 400 });
  if (!mfa.totpSecretEnc) return NextResponse.json({ ok: false, error: "Secret tapılmadı." }, { status: 400 });

  let ok = false;

  if (/^\d{6}$/.test(code)) {
    const secret = decryptSecret(mfa.totpSecretEnc);
    ok = verifyTotp({ token: code, secret });
  } else {
    const consumed = await consumeRecoveryCode({ code, hashesJson: mfa.recoveryCodesHash });
    if (consumed.ok) {
      ok = true;
      await prisma.adminMfa.update({ where: { id: 1 }, data: { recoveryCodesHash: consumed.newHashesJson } });
    }
  }

  if (!ok) return NextResponse.json({ ok: false, error: "Kod yanlışdır." }, { status: 401 });

  const res = NextResponse.json({ ok: true, step: "DONE" });
  res.cookies.set(getAdminCookieName(), makeAdminCookieValue(adminUser()), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  // clear flow cookie
  res.cookies.set(getFlowCookieName(), "", { path: "/", maxAge: 0, secure: process.env.NODE_ENV === "production" });
  return res;
}
