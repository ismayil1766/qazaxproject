import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionResponse, getSessionTokenFromRequest, requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { checkPasswordPolicy } from "@/lib/passwordPolicy";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { notifyUser } from "@/lib/notify";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const ip = getIp(req);
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const rl = rateLimit(`chgpass:${ip}:${user.id}`, 10, 30 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Çox cəhd etdiniz. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const pw = checkPasswordPolicy(parsed.data.newPassword);
  if (!pw.ok) return NextResponse.json({ error: pw.error }, { status: 400 });

  const u = await prisma.user.findUnique({ where: { id: user.id } });
  if (!u || u.isBlocked) return NextResponse.json({ error: "Hesab tapılmadı" }, { status: 404 });

  const ok = await verifyPassword(parsed.data.currentPassword, u.passwordHash);
  if (!ok) return NextResponse.json({ error: "Cari şifrə yanlışdır" }, { status: 401 });

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash } });

  // Bildiriş
  await notifyUser({
    userId: u.id,
    title: "Şifrə dəyişdirildi",
    body: "Hesabınızın şifrəsi uğurla dəyişdirildi. Bu siz deyilsinizsə, dərhal hesabdan çıxış edin və şifrəni yeniləyin.",
    href: "/profil?tab=tehlukesizlik",
    kind: "SECURITY",
  }).catch(() => {});

  // Sessiya rotasiyası: bütün sessiyaları sil, yenisini yarat
  const currentToken = getSessionTokenFromRequest(req);
  await prisma.session.deleteMany({ where: { userId: u.id } }).catch(() => {});
  const sess = await createSessionResponse(u.id);

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sess.cookie);
  // Əgər köhnə token fərqli id-lə bağlı idisə, yenə də ok.
  void currentToken;
  return res;
}
