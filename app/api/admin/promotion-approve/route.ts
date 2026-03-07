import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getPromotionEndDate, humanPromotionKind, normalizePromotionKind } from "@/lib/promotion";
import { normalizeFlags } from "@/lib/utils";
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
  const paymentStatusRaw = String(form?.get("paymentStatus") || "PAID").trim().toUpperCase();
  const paymentStatus = ["PAID", "WAIVED", "UNPAID"].includes(paymentStatusRaw) ? paymentStatusRaw : "PAID";

  if (!requestId) return NextResponse.json({ error: "requestId yoxdur" }, { status: 400 });

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const requestRow = await tx.listingPromotionRequest.findUnique({
      where: { id: requestId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            userId: true,
            status: true,
            flags: true,
            vipUntil: true,
            premiumUntil: true,
          },
        },
      },
    });

    if (!requestRow) return { error: "Sorğu tapılmadı", status: 404 as const };
    if (requestRow.status !== "PENDING") return { error: "Sorğu artıq işlənib", status: 409 as const };
    if (!requestRow.listing) return { error: "Elan tapılmadı", status: 404 as const };
    if (!["PENDING", "ACTIVE"].includes(requestRow.listing.status)) {
      return { error: "Bu statusdakı elan üçün aktivləşdirmə etmək olmur", status: 400 as const };
    }

    const kind = normalizePromotionKind(requestRow.kind);
    if (!kind) return { error: "Promo tipi yanlışdır", status: 400 as const };

    const flags = normalizeFlags(requestRow.listing.flags) as any;
    const currentEnd = kind === "VIP" ? requestRow.listing.vipUntil : requestRow.listing.premiumUntil;
    const startAt = currentEnd && new Date(currentEnd).getTime() > now.getTime() ? new Date(currentEnd) : now;
    const endAt = getPromotionEndDate(startAt, requestRow.planDays);

    if (kind === "VIP") {
      flags.vip = true;
    } else {
      flags.premium = true;
    }

    await tx.listing.update({
      where: { id: requestRow.listing.id },
      data: {
        flags: JSON.stringify(flags),
        vipUntil: kind === "VIP" ? endAt : undefined,
        premiumUntil: kind === "PREMIUM" ? endAt : undefined,
      },
    });

    const updatedRequest = await tx.listingPromotionRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        paymentStatus,
        adminNote,
        reviewedAt: now,
        reviewedBy: "admin",
        startsAt: startAt,
        endsAt: endAt,
      },
      select: {
        id: true,
        kind: true,
        planDays: true,
        userId: true,
        listingId: true,
        listing: { select: { title: true } },
        endsAt: true,
      },
    });

    return { ok: true as const, request: updatedRequest };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await notifyUser({
    userId: result.request.userId,
    title: `${humanPromotionKind(result.request.kind as any)} aktivləşdirildi`,
    body: `“${result.request.listing.title}” üçün ${result.request.planDays} günlük ${humanPromotionKind(result.request.kind as any)} aktiv edildi.${result.request.endsAt ? ` Bitmə: ${new Date(result.request.endsAt).toLocaleDateString("az-AZ")}.` : ""}`,
    href: `/elan/${result.request.listingId}`,
    kind: "LISTING",
  }).catch(() => {});

  return redirectBack(req, "/admin?tab=boost-requests");
}
