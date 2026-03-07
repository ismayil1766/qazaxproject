import { prisma } from "@/lib/db";
import { normalizeFlags } from "@/lib/utils";

/**
 * Elan müddəti bitibsə (expiresAt <= indi), status-u ARCHIVED et.
 * Bu funksiyanı siyahı/detail sorğularından əvvəl çağırmaq kifayətdir (cron olmadan).
 */
export async function archiveExpiredListings() {
  const now = new Date();
  await prisma.listing.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null, lte: now },
    },
    data: { status: "ARCHIVED" },
  }).catch(() => {});

  // VIP/Premium vaxtı bitibsə cleanup et.
  const expired = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { vipUntil: { not: null, lte: now } },
        { premiumUntil: { not: null, lte: now } },
      ],
    },
    select: { id: true, flags: true, vipUntil: true, premiumUntil: true },
    take: 400,
  }).catch(() => [] as any[]);

  for (const l of expired as any[]) {
    const flags = normalizeFlags(l.flags) as any;
    let dirty = false;

    if (l.vipUntil && new Date(l.vipUntil).getTime() <= now.getTime()) {
      if (flags.vip) {
        flags.vip = false;
        dirty = true;
      }
    }

    if (l.premiumUntil && new Date(l.premiumUntil).getTime() <= now.getTime()) {
      if (flags.premium) {
        flags.premium = false;
        dirty = true;
      }
    }

    await prisma.listing.update({
      where: { id: l.id },
      data: {
        flags: dirty ? JSON.stringify(flags) : undefined,
        vipUntil: l.vipUntil && new Date(l.vipUntil).getTime() <= now.getTime() ? null : undefined,
        premiumUntil: l.premiumUntil && new Date(l.premiumUntil).getTime() <= now.getTime() ? null : undefined,
      },
    }).catch(() => {});
  }
}

export function getListingExpiryDays() {
  const d = Number(process.env.LISTING_TTL_DAYS || "30");
  return Math.max(1, Math.min(365, d));
}

export function computeExpiresAt(from: Date = new Date()) {
  const days = getListingExpiryDays();
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
