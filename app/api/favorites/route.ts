import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeFlags, normalizeImages } from "@/lib/utils";
import { getActivePromotionFlags } from "@/lib/promotion";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const items = favs
    .map((f) => f.listing)
    .filter(Boolean)
    .map((l) => {
      const promo = getActivePromotionFlags((l as any).flags, (l as any).vipUntil, (l as any).premiumUntil);
      return {
        ...l,
        images: normalizeImages((l as any).images),
        flags: promo.flags,
        vipUntil: promo.vipUntil,
        premiumUntil: promo.premiumUntil,
      };
    });

  return NextResponse.json({ items });
}
