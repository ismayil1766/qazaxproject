import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, adminUser } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { checkPasswordPolicy } from "@/lib/passwordPolicy";
import { hashPassword } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { normalizePhone, normalizeEmail, isLikelyEmail } from "@/lib/loginIdentity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const ok = await requireAdmin(req, url.searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  const form = await req.formData();
  const requestId = String(form.get("requestId") || "").trim();
  const userId = String(form.get("userId") || "").trim();
  const identity = String(form.get("identity") || "").trim();
  const newPassword = String(form.get("newPassword") || "");
  const next = String(form.get("next") || "/admin?tab=sifre-berpa");
  const mode = String(form.get("mode") || "reset");

  const passwordCheck = checkPasswordPolicy(newPassword);
  if (mode !== "close" && !passwordCheck.ok) {
    return redirectTo(req, `${next}&msg=${encodeURIComponent(passwordCheck.error)}`);
  }

  if (mode === "manual" || (!requestId && (userId || identity))) {
    const normalizedPhone = normalizePhone(identity);
    const normalizedEmail = isLikelyEmail(identity) ? normalizeEmail(identity) : null;

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true, email: true } })
      : await prisma.user.findFirst({
          where: normalizedPhone
            ? { phone: normalizedPhone }
            : normalizedEmail
              ? { email: normalizedEmail }
              : { id: identity },
          select: { id: true, phone: true, email: true },
        });

    if (!user) {
      return redirectTo(req, `${next}&msg=${encodeURIComponent("İstifadəçi tapılmadı. Telefon, email və ya user ID ilə yenidən yoxlayın.")}`);
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});

    await prisma.passwordResetRequest.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { userId: user.id },
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: `${adminUser()} (manual)`,
      },
    }).catch(() => {});

    await notifyUser({
      userId: user.id,
      title: "Şifrə yeniləndi",
      body: "Admin hesabınızın şifrəsini yenilədi. Yeni şifrəni yalnız sizə birbaşa verilməlidir.",
      href: "/daxil-ol",
      kind: "SECURITY",
    }).catch(() => {});

    return redirectTo(req, `${next}&msg=${encodeURIComponent("İstifadəçinin şifrəsi uğurla yeniləndi.")}`);
  }

  if (!requestId) {
    return redirectTo(req, `${next}&msg=${encodeURIComponent("Sorğu ID tapılmadı.")}`);
  }

  const requestRow = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  if (!requestRow) {
    return redirectTo(req, `${next}&msg=${encodeURIComponent("Şifrə bərpa sorğusu tapılmadı.")}`);
  }

  if (requestRow.status === "RESOLVED") {
    return redirectTo(req, `${next}&msg=${encodeURIComponent("Bu sorğu artıq bağlanıb.")}`);
  }

  if (mode === "close") {
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: adminUser(),
      },
    });
    return redirectTo(req, `${next}&msg=${encodeURIComponent("Sorğu bağlandı.")}`);
  }

  if (!userId) {
    return redirectTo(req, `${next}&msg=${encodeURIComponent("Bu sorğu üçün bağlı istifadəçi tapılmadı.")}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true } });
  if (!user) {
    return redirectTo(req, `${next}&msg=${encodeURIComponent("İstifadəçi tapılmadı.")}`);
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: adminUser(),
    },
  });

  await notifyUser({
    userId,
    title: "Şifrə yeniləndi",
    body: "Admin hesabınızın şifrəsini yenilədi. Yeni şifrəni yalnız sizə birbaşa verilməlidir.",
    href: "/daxil-ol",
    kind: "SECURITY",
  }).catch(() => {});

  return redirectTo(req, `${next}&msg=${encodeURIComponent("Şifrə yeniləndi və sorğu bağlandı.")}`);
}
