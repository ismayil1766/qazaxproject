import { NextResponse } from "next/server";
import { adminUser, adminPass } from "@/lib/adminAuth";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { issueOtp } from "@/lib/otp";
import { getAdminMfa } from "@/lib/adminMfaStore";
import { getFlowCookieName, makeFlowCookie } from "@/lib/adminLoginFlow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = rateLimit(`admin:start:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "");
  const password = String(body?.password || "");

  if (username !== adminUser() || password !== adminPass()) {
    return NextResponse.json({ ok: false, error: "Login və ya parol yanlışdır." }, { status: 401 });
  }

  const mfa = await getAdminMfa();
  try {
    await issueOtp({ email: mfa.email, purpose: "ADMIN_LOGIN" });
  } catch (e: any) {
    const msg = String(e?.message || "OTP göndərmək alınmadı.");
    // Resend limit və oxşar gözlənilən xətalar 500 verməsin
    const status = /Kod artıq göndərilib/i.test(msg) ? 429 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  const res = NextResponse.json({ ok: true, step: "EMAIL_OTP" });
  res.cookies.set(getFlowCookieName(), makeFlowCookie(), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
