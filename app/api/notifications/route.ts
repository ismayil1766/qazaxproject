import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, Math.max(5, Number(searchParams.get("take") || 50)));

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ items });
}

const MarkSchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = MarkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  const now = new Date();

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  const ids = parsed.data.ids || [];
  if (!ids.length) return NextResponse.json({ ok: true });

  await prisma.notification.updateMany({
    where: { userId: user.id, id: { in: ids } },
    data: { readAt: now },
  });

  return NextResponse.json({ ok: true });
}

const DeleteSchema = z.object({
  ids: z.array(z.string().min(1)).max(100),
});

export async function DELETE(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  await prisma.notification.deleteMany({
    where: { userId: user.id, id: { in: parsed.data.ids } },
  });

  return NextResponse.json({ ok: true });
}
