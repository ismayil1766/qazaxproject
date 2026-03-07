import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeExpiresAt } from "@/lib/archive";
import { requireAdmin } from "@/lib/adminAuth";
import { notifyUser } from "@/lib/notify";
import { redirectBack } from "@/lib/redirect";
import { normalizeFlags } from "@/lib/utils";

export const runtime = "nodejs";


export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  // When approving, if user has already toggled VIP on a pending listing,
  // set vipUntil starting from approval time.
  const now = new Date();
  const days = Number(process.env.VIP_DAYS || "7");
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(365, Math.trunc(days))) : 7;

  const listing = await prisma.$transaction(async (tx) => {
    const cur = await tx.listing.findUnique({
      where: { id },
      select: { id: true, title: true, userId: true, flags: true, vipUntil: true },
    });
    if (!cur) return null;
    const flags: any = normalizeFlags(cur.flags);
    const wantVip = Boolean(flags.vip);
    const vipUntil = wantVip && !cur.vipUntil ? new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000) : cur.vipUntil;
    return tx.listing.update({
      where: { id },
      data: { status: "ACTIVE", expiresAt: computeExpiresAt(now), vipUntil },
      select: { id: true, title: true, userId: true },
    });
  });
  if (!listing) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });

  await notifyUser({
    userId: listing.userId,
    title: "Elan təsdiqləndi",
    body: `“${listing.title}” elanınız təsdiqləndi və aktivləşdirildi.`,
    href: `/elan/${listing.id}`,
    kind: "LISTING",
  }).catch(() => {});

  return redirectBack(req, "/admin?tab=moderasiya");
}
