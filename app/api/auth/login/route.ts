import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionResponse, verifyPassword } from "@/lib/auth";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { isLikelyEmail, normalizeEmail, normalizePhone } from "@/lib/loginIdentity";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  identifier: z.string().min(3).max(120).optional(),
  email: z.string().min(3).max(120).optional(),
  phone: z.string().min(3).max(40).optional(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const ip = getIp(req);
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });
  }

  const rawIdentifier = parsed.data.identifier || parsed.data.phone || parsed.data.email || "";
  const identifier = String(rawIdentifier).trim();
  const password = parsed.data.password;
  if (!identifier) return NextResponse.json({ error: "Telefon nömrəsini yazın" }, { status: 400 });

  const normalizedIdentifier = isLikelyEmail(identifier)
    ? (normalizeEmail(identifier) || identifier.toLowerCase())
    : (normalizePhone(identifier) || identifier.replace(/\s+/g, ""));

  const ipRl = rateLimit(`login:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!ipRl.ok) {
    return NextResponse.json({ error: "Çox cəhd etdiniz. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  }

  const subjectRl = rateLimit(`login:subject:${normalizedIdentifier.toLowerCase()}`, 8, 10 * 60 * 1000);
  if (!subjectRl.ok) {
    return NextResponse.json({ error: "Bu hesab üçün çox cəhd edildi. Bir az sonra yenidən yoxlayın." }, { status: 429 });
  }

  const user = isLikelyEmail(identifier)
    ? await prisma.user.findUnique({ where: { email: normalizeEmail(identifier) || "" } })
    : await prisma.user.findFirst({ where: { phone: normalizePhone(identifier) || "__missing__" } });

  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "Telefon nömrəsi və ya şifrə yanlışdır" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Telefon nömrəsi və ya şifrə yanlışdır" }, { status: 401 });
  }

  const sess = await createSessionResponse(user.id);
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
    },
  });
  res.headers.set("Set-Cookie", sess.cookie);
  return res;
}
