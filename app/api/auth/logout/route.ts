import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSessionCookie, getSessionTokenFromRequest } from "@/lib/auth";

export const runtime = "nodejs";


export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
