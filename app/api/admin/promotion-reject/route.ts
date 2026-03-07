import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { humanPromotionKind, normalizePromotionKind } from "@/lib/promotion";
import { notifyUser } from "@/lib/notify";
import { redirectBack } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const requestId = String(form?.get("requestId") || searchParams.get("requestId") || "").trim();
  const adminNote = String(form?.get("adminNote") || "").trim().slice(0, 500) || null;
  if (!requestId) return NextResponse.json({ error: "requestId yoxdur" }, { status: 400 });

  const requestRow = await prisma.listingPromotionRequest.findUnique({
    where: { id: requestId },
    include: { listing: { select: { id: true, title: true } } },
  });
  if (!requestRow) return NextResponse.json({ error: "Sorğu tapılmadı" }, { status: 404 });
  if (requestRow.status !== "PENDING") return NextResponse.json({ error: "Sorğu artıq işlənib" }, { status: 409 });

  await prisma.listingPromotionRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      adminNote,
      reviewedAt: new Date(),
      reviewedBy: "admin",
    },
  });

  const kind = normalizePromotionKind(requestRow.kind) || "PREMIUM";
  await notifyUser({
    userId: requestRow.userId,
    title: `${humanPromotionKind(kind)} müraciəti rədd edildi`,
    body: adminNote || `“${requestRow.listing?.title || "Elan"}” üçün göndərdiyin müraciət rədd edildi.`,
    href: "/profil?tab=elanlarim",
    kind: "SYSTEM",
  }).catch(() => {});

  return redirectBack(req, "/admin?tab=boost-requests");
}
