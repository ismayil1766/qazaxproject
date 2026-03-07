import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { slugifyAz } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const ok = await requireAdmin(req, url.searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  const form = await req.formData();
  const id = (form.get("id") as string) || "";
  const parentIdRaw = (form.get("parentId") as string) || "";
  const parentId = parentIdRaw.trim() || null;
  const nameAz = ((form.get("nameAz") as string) || "").trim();
  const slugInput = ((form.get("slug") as string) || "").trim();
  const slug = slugifyAz(slugInput);

  if (!nameAz || !slug) {
    return redirectTo(req, "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("Ad və slug doldurulmalıdır."));
  }

  try {
    if (id) {
      await prisma.category.update({
        where: { id },
        data: { nameAz, slug, parentId },
      });
    } else {
      await prisma.category.create({
        data: { nameAz, slug, parentId },
      });
    }
  } catch (e) {
    // Slug unique ola bilər: sadə redirect
    return redirectTo(req, "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("Bu slug artıq mövcuddur. Başqa slug seç."));
  }

  return redirectTo(req, "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("Kateqoriya yadda saxlanıldı."));
}
