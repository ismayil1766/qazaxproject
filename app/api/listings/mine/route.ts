import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { archiveExpiredListings } from "@/lib/archive";
import { normalizeFlags, normalizeImages } from "@/lib/utils";
import { getActivePromotionFlags } from "@/lib/promotion";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await archiveExpiredListings();
  const user = await requireUser(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";

  const where: any = { userId: user.id };
  if (status !== "ALL") where.status = status;

  const items = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      promotionRequests: {
        orderBy: { requestedAt: "desc" },
        take: 6,
      },
    },
  });

  const normalized = items.map((l) => {
    const promo = getActivePromotionFlags(l.flags, l.vipUntil, (l as any).premiumUntil);
    return {
      ...l,
      images: normalizeImages(l.images),
      flags: promo.flags,
      vipUntil: promo.vipUntil,
      premiumUntil: promo.premiumUntil,
      promotionRequests: (l as any).promotionRequests ?? [],
    };
  });

  return NextResponse.json({ items: normalized });
}
