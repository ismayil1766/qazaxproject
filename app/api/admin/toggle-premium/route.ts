import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeFlags } from "@/lib/utils";
import { redirectBack } from "@/lib/redirect";
import { getPromotionPlan } from "@/lib/promotion";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const l = await prisma.listing.findUnique({ where: { id }, select: { flags: true, premiumUntil: true } });
  if (!l) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });

  const flags = normalizeFlags(l.flags) as any;
  const nextPremium = !Boolean(flags.premium);
  flags.premium = nextPremium;

  const plan = getPromotionPlan("PREMIUM", Number(process.env.PREMIUM_DEFAULT_DAYS || "30"));
  const premiumUntil = nextPremium ? new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000) : null;

  await prisma.listing.update({ where: { id }, data: { flags: JSON.stringify(flags), premiumUntil } });

  return redirectBack(req, "/admin?tab=moderasiya");
}
