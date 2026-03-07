import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { notifyUser } from "@/lib/notify";
import { redirectTo } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";

  const ok = await requireAdmin(req, url.searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const next = (form?.get("next") as string) || "/admin?tab=istifadeciler";

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, isBlocked: true, email: true } });
  if (!user) return NextResponse.json({ error: "User tapılmadı" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { isBlocked: !user.isBlocked },
    select: { id: true, isBlocked: true, email: true },
  });

  await notifyUser({
    userId: updated.id,
    title: updated.isBlocked ? "Hesab bloklandı" : "Hesab bloku açıldı",
    body: updated.isBlocked
      ? "Admin tərəfindən hesabınıza giriş məhdudlaşdırıldı."
      : "Admin tərəfindən hesabınıza qoyulan məhdudiyyət götürüldü.",
    href: "/profil?tab=profil",
    kind: "SECURITY",
  }).catch(() => {});

  return redirectTo(req, next);
}
