import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeImages } from "@/lib/utils";
import { deleteImagesFromBucket } from "@/lib/media";
import { redirectBack } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const l = await prisma.listing.findUnique({ where: { id }, select: { id: true, images: true } });
  if (!l) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });

  const urls = normalizeImages(l.images);
  await deleteImagesFromBucket(urls).catch(() => {});
  await prisma.listing.delete({ where: { id } });

  return redirectBack(req, "/admin?tab=moderasiya");
}
