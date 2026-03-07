import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ids: [] });

  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    select: { listingId: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ ids: favs.map((x) => x.listingId) });
}
