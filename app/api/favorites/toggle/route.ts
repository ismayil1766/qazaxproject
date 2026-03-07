import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({ listingId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  const listingId = parsed.data.listingId;

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, favorited: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, listingId } });
  return NextResponse.json({ ok: true, favorited: true });
}
