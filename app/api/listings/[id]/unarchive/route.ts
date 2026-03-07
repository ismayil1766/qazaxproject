import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeExpiresAt } from "@/lib/archive";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
  if (listing.userId !== user.id) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  // Arxivdən çıxanda aktivə qaytarırıq. Əgər vaxtı keçibsə, yeni expiresAt veririk.
  const expiresAt = listing.expiresAt && listing.expiresAt.getTime() > Date.now() ? listing.expiresAt : computeExpiresAt(new Date());

  await prisma.listing.update({ where: { id: listing.id }, data: { status: "ACTIVE", expiresAt } });
  return NextResponse.json({ ok: true });
}
