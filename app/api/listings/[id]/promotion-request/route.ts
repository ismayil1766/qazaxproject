import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { getPromotionPlan, normalizePlanDays, normalizePromotionKind } from "@/lib/promotion";
import { notifyUser } from "@/lib/notify";
import { promotionRequestsEnabled } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const user = await requireUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  if (!promotionRequestsEnabled()) {
    return NextResponse.json({ error: "VIP və Premium müraciətləri hazırda deaktivdir." }, { status: 403 });
  }

  const ip = getIp(req);
  const rl = rateLimit(`promotion-request:${user.id}:${ip}`, 8, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Çox tez-tez sorğu göndərirsən. Bir az sonra yenə yoxla." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = normalizePromotionKind(body?.kind);
  if (!kind) return NextResponse.json({ error: "Promo tipi yanlışdır" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, title: true, flags: true, vipUntil: true, premiumUntil: true },
  });
  if (!listing) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });
  if (listing.userId !== user.id) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  if (!["PENDING", "ACTIVE"].includes(listing.status)) {
    return NextResponse.json({ error: "Bu statusdakı elan üçün müraciət göndərmək olmur." }, { status: 400 });
  }

  const planDays = normalizePlanDays(kind, body?.planDays);
  const plan = getPromotionPlan(kind, planDays);
  const note = String(body?.note || "").trim().slice(0, 500) || null;

  const existing = await prisma.listingPromotionRequest.findFirst({
    where: {
      listingId: listing.id,
      kind,
      status: "PENDING",
    },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: `${kind === "VIP" ? "VIP" : "Premium"} üçün artıq gözləyən müraciət var.` }, { status: 409 });
  }

  const created = await prisma.listingPromotionRequest.create({
    data: {
      listingId: listing.id,
      userId: user.id,
      kind,
      planDays,
      price: plan.price,
      currency: plan.currency,
      paymentStatus: "UNPAID",
      applicantNote: note,
    },
    select: {
      id: true,
      kind: true,
      planDays: true,
      price: true,
      currency: true,
      status: true,
      paymentStatus: true,
      requestedAt: true,
    },
  });

  await notifyUser({
    userId: user.id,
    title: `${kind === "VIP" ? "VIP" : "Premium"} müraciəti göndərildi`,
    body: `“${listing.title}” üçün ${planDays} günlük müraciət qeydə alındı. Admin ödənişi yoxlayıb aktivləşdirəcək.`,
    href: "/profil?tab=elanlarim",
    kind: "SYSTEM",
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    request: {
      ...created,
      requestedAt: created.requestedAt.toISOString(),
    },
    message: `${kind === "VIP" ? "VIP" : "Premium"} müraciəti göndərildi. Admin təsdiqindən sonra aktiv olacaq.`,
  });
}
