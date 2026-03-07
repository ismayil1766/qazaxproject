import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ count: 0 });

  const count = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return NextResponse.json({ count });
}
