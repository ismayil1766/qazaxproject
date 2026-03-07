import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeFlags } from "@/lib/utils";
import { redirectBack } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const l = await prisma.listing.findUnique({ where: { id }, select: { flags: true, vipUntil: true } });
  if (!l) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });

  const flags = normalizeFlags(l.flags) as any;
  const nextVip = !Boolean(flags.vip);
  flags.vip = nextVip;

  // VIP aktiv ediləndə 7 gün (default) ver.
  const days = Number(process.env.VIP_DAYS || "7");
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(365, Math.trunc(days))) : 7;
  const vipUntil = nextVip ? new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000) : null;

  await prisma.listing.update({ where: { id }, data: { flags: JSON.stringify(flags), vipUntil } });

  return redirectBack(req, "/admin?tab=moderasiya");
}
