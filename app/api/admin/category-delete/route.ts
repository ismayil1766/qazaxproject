import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const ok = await requireAdmin(req, url.searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  const form = await req.formData();
  const id = ((form.get("id") as string) || "").trim();
  if (!id) return redirectTo(req, "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("ID tapılmadı."));

  // Təhlükəsizlik: üstündə elan varsa silmirik (sadə qayda)
  const listingsCount = await prisma.listing.count({ where: { categoryId: id } });
  const childrenCount = await prisma.category.count({ where: { parentId: id } });

  if (listingsCount > 0 || childrenCount > 0) {
    return redirectTo(
      req,
      "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("Silinmədi: kateqoriyada elan və ya alt kateqoriya var.")
    );
  }

  await prisma.category.delete({ where: { id } }).catch(() => {});
  return redirectTo(req, "/admin?tab=kateqoriyalar&msg=" + encodeURIComponent("Kateqoriya silindi."));
}
