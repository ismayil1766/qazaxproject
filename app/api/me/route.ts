import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { normalizePhone } from "@/lib/loginIdentity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, lastName: true, phone: true, avatarUrl: true, createdAt: true },
  });

  return NextResponse.json({ user: u });
}

const UpdateSchema = z.object({
  name: z.string().max(60).optional().nullable(),
  lastName: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().max(300).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  const data = parsed.data;

  let normalizedPhone: string | null | undefined = undefined;
  if (data.phone !== undefined) {
    normalizedPhone = data.phone?.trim() ? normalizePhone(data.phone) : null;
    if (data.phone?.trim() && !normalizedPhone) {
      return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });
    }
    if (normalizedPhone) {
      const anotherUser = await prisma.user.findFirst({
        where: { phone: normalizedPhone, id: { not: user.id } },
        select: { id: true },
      });
      if (anotherUser) {
        return NextResponse.json({ error: "Bu telefon nömrəsi başqa hesabda istifadə olunur" }, { status: 409 });
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name === undefined ? undefined : (data.name?.trim() || null),
      lastName: data.lastName === undefined ? undefined : (data.lastName?.trim() || null),
      phone: normalizedPhone === undefined ? undefined : normalizedPhone,
      avatarUrl: data.avatarUrl === undefined ? undefined : (data.avatarUrl?.trim() || null),
    },
    select: { id: true, email: true, name: true, lastName: true, phone: true, avatarUrl: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
