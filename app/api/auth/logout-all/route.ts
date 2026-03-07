import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSessionCookie, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
