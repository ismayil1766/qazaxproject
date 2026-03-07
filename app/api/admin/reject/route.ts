import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { notifyUser } from "@/lib/notify";
import { redirectBack } from "@/lib/redirect";

export const runtime = "nodejs";


export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const fd = await req.formData().catch(() => null);
  const reasonRaw = fd ? String(fd.get("reason") || "").trim() : "";
  const reason = reasonRaw.length > 500 ? reasonRaw.slice(0, 500) : reasonRaw;

  const listing = await prisma.listing.update({
    where: { id },
    data: { status: "REJECTED", rejectReason: reason || null },
    select: { id: true, title: true, userId: true, rejectReason: true },
  });

  await notifyUser({
    userId: listing.userId,
    title: "Elan rədd edildi",
    body: listing.rejectReason
      ? `“${listing.title}” elanınız rədd edildi. Səbəb: ${listing.rejectReason}`
      : `“${listing.title}” elanınız rədd edildi.`,
    href: `/profil?tab=elanlarim`,
    kind: "LISTING",
  }).catch(() => {});

  return redirectBack(req, "/admin?tab=moderasiya");
}
