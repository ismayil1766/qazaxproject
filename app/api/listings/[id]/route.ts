import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest, requireUser } from "@/lib/auth";
import { normalizeFlags, normalizeImages } from "@/lib/utils";
import { getActivePromotionFlags } from "@/lib/promotion";
import { deleteImagesFromBucket } from "@/lib/media";
import { ensureCoreCategories } from "@/lib/ensureCoreCategories";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { normalizePhone } from "@/lib/loginIdentity";
import { z } from "zod";

export const runtime = "nodejs";

const VehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(2100),
  mileageKm: z.number().int().min(0).optional(),
  engine: z.string().optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
  barter: z.boolean().optional(),
  credit: z.boolean().optional(),
});

const RealEstateSchema = z.object({
  propertyType: z.string().optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  areaM2: z.number().int().min(0).optional(),
  floor: z.number().int().min(0).optional(),
  totalFloors: z.number().int().min(0).optional(),
});

const PhoneSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  storageGb: z.number().int().min(0).optional(),
  condition: z.string().optional(),
});

const PatchSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(10).optional(),
  price: z.number().int().min(0).nullable().optional(),
  currency: z.string().optional(),
  city: z.string().min(2).optional(),
  district: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  contactName: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  whatsapp: z.string().optional().nullable(),
  flags: z.record(z.any()).optional(),
  categorySlug: z.string().optional(),

  // vehicle
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  mileageKm: z.number().int().optional(),
  engine: z.string().optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
  barter: z.boolean().optional(),
  credit: z.boolean().optional(),

  // phone
  phoneBrand: z.string().optional(),
  phoneModel: z.string().optional(),
  phoneStorageGb: z.number().int().optional(),
  phoneCondition: z.string().optional(),

  // real estate
  propertyType: z.string().optional(),
  rooms: z.number().int().optional(),
  areaM2: z.number().int().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      vehicle: true,
      realEstate: true,
      phoneDetails: true,
      category: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });

  const user = await getUserFromRequest(req).catch(() => null);
  const canView = item.status === "ACTIVE" || (user && (user.id === item.userId || user.role === "ADMIN"));
  if (!canView) {
    return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
  }

  const promo = getActivePromotionFlags(item.flags, item.vipUntil, (item as any).premiumUntil);

  return NextResponse.json({
    item: {
      ...item,
      images: normalizeImages(item.images),
      flags: promo.flags,
      vipUntil: promo.vipUntil,
      premiumUntil: promo.premiumUntil,
      user: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            phone: item.user.phone,
          }
        : null,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const user = await requireUser(req);
  const listing = await prisma.listing.findUnique({ where: { id: params.id }, include: { vehicle: true, realEstate: true, phoneDetails: true, category: true } });
  if (!listing) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
  if (listing.userId !== user.id) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Məlumatlar düzgün deyil" }, { status: 400 });
  const data = parsed.data;

  await ensureCoreCategories();

  const update: any = {};

  if (data.categorySlug) {
    let cat = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
    if (!cat && listing.type === "GENERAL") {
      cat = await prisma.category.findUnique({ where: { slug: "umumi-elan" } });
    }
    if (!cat) return NextResponse.json({ error: "Kateqoriya tapılmadı" }, { status: 400 });
    update.categoryId = cat.id;
  }

  // Determine if (new/current) category is real-estate
  const effectiveCategoryId = update.categoryId ?? listing.categoryId;
  const effectiveCat = await prisma.category.findUnique({ where: { id: effectiveCategoryId } });
  const effectiveParent = effectiveCat?.parentId ? await prisma.category.findUnique({ where: { id: effectiveCat.parentId } }) : null;
  const isRealEstate = effectiveParent?.slug === "dasinmaz-emlak" || effectiveCat?.slug === "dasinmaz-emlak";
  const isPhone = (effectiveCat?.slug ?? "").includes("telefon") || (effectiveParent?.slug ?? "").includes("telefon");

  const scalarFields = ["title", "description", "currency", "city", "contactName"] as const;
  for (const f of scalarFields) {
    if ((data as any)[f] !== undefined) {
      const raw = (data as any)[f];
      update[f] = typeof raw === "string" ? raw.trim() : raw;
    }
  }
  if (data.phone !== undefined) {
    const normalizedPhone = normalizePhone(data.phone);
    if (!normalizedPhone) return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });
    update.phone = normalizedPhone;
  }
  if (data.price !== undefined) update.price = data.price;
  if (data.district !== undefined) update.district = data.district?.trim() || null;
  if (data.whatsapp !== undefined) {
    if (data.whatsapp?.trim()) {
      const normalizedWhatsapp = normalizePhone(data.whatsapp);
      if (!normalizedWhatsapp) return NextResponse.json({ error: "WhatsApp nömrəsi düzgün deyil" }, { status: 400 });
      update.whatsapp = normalizedWhatsapp;
    } else {
      update.whatsapp = null;
    }
  }
  if (data.flags !== undefined) {
    const incoming = normalizeFlags(data.flags) as any;
    const currentFlags = normalizeFlags(listing.flags) as any;
    update.flags = JSON.stringify({
      ...currentFlags,
      urgent: Boolean(incoming.urgent),
      vip: Boolean(currentFlags.vip),
      premium: Boolean(currentFlags.premium),
    });
  }
  if (data.images !== undefined) update.images = JSON.stringify(normalizeImages(data.images));

  // Dəyişiklikdən sonra elan yenidən moderasiyaya düşsün
  update.status = "PENDING";

  let vehicleUpdate: any = null;
  if (listing.type === "VEHICLE") {
    const v = VehicleSchema.safeParse({
      make: data.make ?? listing.vehicle?.make,
      model: data.model ?? listing.vehicle?.model,
      year: data.year ?? listing.vehicle?.year,
      mileageKm: data.mileageKm ?? listing.vehicle?.mileageKm ?? undefined,
      engine: data.engine ?? listing.vehicle?.engine ?? undefined,
      fuel: data.fuel ?? listing.vehicle?.fuel ?? undefined,
      transmission: data.transmission ?? listing.vehicle?.transmission ?? undefined,
      bodyType: data.bodyType ?? listing.vehicle?.bodyType ?? undefined,
      color: data.color ?? listing.vehicle?.color ?? undefined,
      vin: data.vin ?? listing.vehicle?.vin ?? undefined,
      barter: data.barter ?? listing.vehicle?.barter ?? false,
      credit: data.credit ?? listing.vehicle?.credit ?? false,
    });
    if (!v.success) return NextResponse.json({ error: "Avtomobil məlumatları düzgün deyil" }, { status: 400 });
    vehicleUpdate = v.data;
  }

  let realEstateUpdate: any = null;
  if (listing.type === "GENERAL" && isRealEstate) {
    const re = RealEstateSchema.safeParse({
      propertyType: data.propertyType ?? listing.realEstate?.propertyType ?? undefined,
      rooms: data.rooms ?? listing.realEstate?.rooms ?? undefined,
      areaM2: data.areaM2 ?? listing.realEstate?.areaM2 ?? undefined,
      floor: data.floor ?? listing.realEstate?.floor ?? undefined,
      totalFloors: data.totalFloors ?? listing.realEstate?.totalFloors ?? undefined,
    });
    if (!re.success) return NextResponse.json({ error: "Daşınmaz əmlak məlumatları düzgün deyil" }, { status: 400 });
    realEstateUpdate = re.data;
  }

  let phoneUpdate: any = null;
  if (listing.type === "GENERAL" && isPhone) {
    const ph = PhoneSchema.safeParse({
      brand: data.phoneBrand ?? listing.phoneDetails?.brand,
      model: data.phoneModel ?? listing.phoneDetails?.model,
      storageGb: data.phoneStorageGb ?? listing.phoneDetails?.storageGb ?? undefined,
      condition: data.phoneCondition ?? listing.phoneDetails?.condition ?? undefined,
    });
    if (!ph.success) return NextResponse.json({ error: "Telefon məlumatları düzgün deyil" }, { status: 400 });
    phoneUpdate = ph.data;
  }


  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...update,
      ...(vehicleUpdate
        ? {
            vehicle: listing.vehicle
              ? { update: vehicleUpdate }
              : { create: vehicleUpdate },
          }
        : {}),
      ...(realEstateUpdate
        ? {
            realEstate: listing.realEstate
              ? { update: realEstateUpdate }
              : { create: realEstateUpdate },
          }
        : {}),
      ...(phoneUpdate
        ? {
            phoneDetails: listing.phoneDetails
              ? { update: phoneUpdate }
              : { create: phoneUpdate },
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(req);
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, images: true },
  });
  if (!listing) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
  if (listing.userId !== user.id) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  const urls = normalizeImages(listing.images);

  // Best-effort: delete images from bucket, then delete listing from DB.
  await deleteImagesFromBucket(urls).catch(() => {});
  await prisma.listing.delete({ where: { id: listing.id } });

  return NextResponse.json({ ok: true });
}
