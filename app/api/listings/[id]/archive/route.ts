import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
  if (listing.userId !== user.id) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  await prisma.listing.update({ where: { id: listing.id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
