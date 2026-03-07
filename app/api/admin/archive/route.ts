import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { redirectBack } from "@/lib/redirect";
import { notifyUser } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  const ok = await requireAdmin(req, searchParams.get("key") || undefined);
  if (!ok) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "ID yoxdur" }, { status: 400 });

  const listing = await prisma.listing.update({
    where: { id },
    data: { status: "ARCHIVED" },
    select: { id: true, title: true, userId: true },
  });

  await notifyUser({
    userId: listing.userId,
    title: "Elan arxivləndi",
    body: `“${listing.title}” elanınız arxivə göndərildi.`,
    href: `/profil?tab=elanlarim`,
    kind: "LISTING",
  }).catch(() => {});

  return redirectBack(req, "/admin?tab=moderasiya");
}
