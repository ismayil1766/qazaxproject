import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { normalizePhone } from "@/lib/loginIdentity";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  phone: z.string().min(7).max(30),
  note: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const ip = getIp(req);
  const ipRl = rateLimit(`forgot:ip:${ip}`, 10, 6 * 60 * 60 * 1000);
  if (!ipRl.ok) return NextResponse.json({ error: "Bu IP-dən çox sorğu edilib. Sonra yenidən yoxlayın." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });

  const rl = rateLimit(`forgot:${ip}:${phone}`, 3, 6 * 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Bu nömrə üçün çox sorğu edilib. Sonra yenidən yoxlayın." }, { status: 429 });

  const existingPending = await prisma.passwordResetRequest.findFirst({
    where: { phone, status: "PENDING", requestedAt: { gt: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
    select: { id: true },
  });
  if (existingPending) {
    return NextResponse.json({ ok: true, message: "Sorğunuz artıq adminə düşüb. Admin sizinlə əlaqə saxlayacaq." });
  }

  const user = await prisma.user.findFirst({ where: { phone }, select: { id: true } });

  await prisma.passwordResetRequest.create({
    data: {
      userId: user?.id || null,
      phone,
      note: parsed.data.note?.trim() || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, message: "Sorğu admin panelinə göndərildi." });
}
