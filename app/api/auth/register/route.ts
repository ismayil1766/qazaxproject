import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionResponse, hashPassword } from "@/lib/auth";
import { checkPasswordPolicy } from "@/lib/passwordPolicy";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { isLikelyEmail, makeInternalEmailFromPhone, normalizeEmail, normalizePhone } from "@/lib/loginIdentity";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(50).optional(),
  phone: z.string().min(7).max(30),
  email: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const ip = getIp(req);
  const ipRl = rateLimit(`register:ip:${ip}`, 8, 60 * 60 * 1000);
  if (!ipRl.ok) return NextResponse.json({ error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Məlumatlar düzgün deyil", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });
  }

  const phoneRl = rateLimit(`register:phone:${normalizedPhone}`, 3, 24 * 60 * 60 * 1000);
  if (!phoneRl.ok) {
    return NextResponse.json({ error: "Bu nömrə üçün çox qeydiyyat cəhdi oldu. Sonra yenidən yoxlayın." }, { status: 429 });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  if (normalizedEmail && !isLikelyEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Email düzgün deyil" }, { status: 400 });
  }
  const email = normalizedEmail || makeInternalEmailFromPhone(normalizedPhone);
  const password = parsed.data.password;
  const name = parsed.data.name?.trim() || null;

  const pw = checkPasswordPolicy(password);
  if (!pw.ok) return NextResponse.json({ error: pw.error }, { status: 400 });

  const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone }, select: { id: true } });
  if (existingPhone) {
    return NextResponse.json({ error: "Bu telefon nömrəsi ilə artıq hesab var" }, { status: 409 });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (existingEmail) {
    if (normalizedEmail) {
      return NextResponse.json({ error: "Bu email ilə artıq hesab var" }, { status: 409 });
    }
    return NextResponse.json({ error: "Bu telefon nömrəsi ilə artıq hesab var" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      phone: normalizedPhone,
      passwordHash,
      name,
      emailVerified: true,
    },
  });

  const sess = await createSessionResponse(user.id);
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
    },
  });
  res.headers.set("Set-Cookie", sess.cookie);
  return res;
}
