import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, S3_ENABLED, s3 } from "@/lib/s3";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Creates a lightweight JSON backup (NOT a full Postgres dump).
 * For full-fidelity backups, also use pg_dump periodically.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });

  const [categories, listings, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.listing.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        currency: true,
        city: true,
        district: true,
        images: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        flags: true,
        type: true,
        status: true,
        rejectReason: true,
        vipUntil: true,
        premiumUntil: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        categoryId: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    }),
  ]);

  const promotionRequests = await prisma.listingPromotionRequest.findMany({ orderBy: { requestedAt: "asc" } });

  const payload = {
    version: 2,
    createdAt: new Date().toISOString(),
    categories,
    users,
    listings,
    promotionRequests,
  };

  const key = `backups/backup-${payload.createdAt.replace(/[:.]/g, "-")}-${crypto.randomUUID()}.json`;
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");

  // Backups are stored in S3/Railway Buckets.
  // If S3 isn't configured, fail gracefully instead of crashing type-check/build.
  if (!S3_ENABLED || !s3 || !S3_BUCKET) {
    return NextResponse.json(
      { error: "S3_CONFIG_MISSING", message: "Backup üçün S3/Bucket konfiqurasiyası tələb olunur." },
      { status: 400 }
    );
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
      CacheControl: "no-store",
    })
  );

  return NextResponse.json({ ok: true, key, url: `/media/${key}` });
}
