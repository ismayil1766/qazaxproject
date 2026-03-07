import { prisma } from "@/lib/db";
import { ensureCoreCategories } from "@/lib/ensureCoreCategories";
import { archiveExpiredListings } from "@/lib/archive";
import { normalizeFlags, normalizeImages } from "@/lib/utils";
import { getActivePromotionFlags } from "@/lib/promotion";
import { Prisma } from "@prisma/client";

export async function getCategories() {
  await ensureCoreCategories();
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { nameAz: "asc" },
    include: { children: { orderBy: { nameAz: "asc" } } },
  });

  // Keep a stable, user-friendly order and make sure core roots are always present.
  const requiredRoots = [
    { slug: "avtomobil", nameAz: "Avtomobil", children: [] },
    { slug: "dasinmaz-emlak", nameAz: "Daşınmaz əmlak", children: [] },
    { slug: "telefonlar", nameAz: "Telefon", children: [] },
    { slug: "umumi-elan", nameAz: "Ümumi elan", children: [] },
    { slug: "is-axtaranlar", nameAz: "İş axtaranlar", children: [] },
  ] as any[];

  const merged = [...roots] as any[];
  for (const req of requiredRoots) {
    if (!merged.some((r) => r.slug === req.slug)) merged.push(req);
  }

  const order = ["avtomobil", "dasinmaz-emlak", "telefonlar", "umumi-elan", "is-axtaranlar"];
  merged.sort((a, b) => {
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return String(a.nameAz || "").localeCompare(String(b.nameAz || "az"));
  });

  return merged;
}

export async function getActiveListings(params: {
  type?: "VEHICLE" | "GENERAL";
  q?: string;
  city?: string;
  categorySlug?: string;
  // vehicle filters
  vehicleMake?: string;
  vehicleModel?: string;
  yearFrom?: number;
  yearTo?: number;

  // phone filters
  phoneBrand?: string;
  phoneModel?: string;

  // real-estate filters
  rooms?: number;
  propertyType?: string;
  floor?: number;
  take?: number;
}) {
  await archiveExpiredListings();
  const { type, q, city, categorySlug, take = 24 } = params;

  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug }, include: { children: true } })
    : null;

  const where: any = { status: "ACTIVE" };
  if (type) where.type = type;
  if (city) where.city = city;
  if (category) {
    const childIds = (category.children ?? []).map((c: any) => c.id);
    // If a root category is selected, include its children (typical marketplace UX).
    // If no children, just filter by itself.
    where.categoryId = childIds.length ? { in: [category.id, ...childIds] } : category.id;
  }

  if (q && q.trim()) {
    const s = q.trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
      // Vehicle search helpers (safe even if type !== VEHICLE)
      { vehicle: { is: { make: { contains: s, mode: "insensitive" } } } },
      { vehicle: { is: { model: { contains: s, mode: "insensitive" } } } },
      { phoneDetails: { is: { brand: { contains: s, mode: "insensitive" } } } },
      { phoneDetails: { is: { model: { contains: s, mode: "insensitive" } } } },
    ];
  }

  // VEHICLE filters
  if (type === "VEHICLE") {
    const v: any = {};
    if (params.vehicleMake) v.make = params.vehicleMake;
    if (params.vehicleModel) v.model = params.vehicleModel;
    if (typeof params.yearFrom === "number" || typeof params.yearTo === "number") {
      v.year = {};
      if (typeof params.yearFrom === "number") v.year.gte = params.yearFrom;
      if (typeof params.yearTo === "number") v.year.lte = params.yearTo;
    }
    if (Object.keys(v).length) {
      where.vehicle = { is: v };
    }
  }

  // REAL ESTATE + PHONE filters (GENERAL only)
  if (type === "GENERAL") {
    const re: any = {};
    const ph: any = {};
    if (typeof params.rooms === "number") re.rooms = params.rooms;
    if (params.propertyType) re.propertyType = params.propertyType;
    if (typeof params.floor === "number") re.floor = params.floor;
    if (Object.keys(re).length) {
      where.realEstate = { is: re };
    }

    if (params.phoneBrand) ph.brand = params.phoneBrand;
    if (params.phoneModel) ph.model = params.phoneModel;
    if (Object.keys(ph).length) {
      where.phoneDetails = { is: ph };
    }
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: [{ vipUntil: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      category: true,
      vehicle: true,
      realEstate: true,
      phoneDetails: true,
    },
  });

  return listings.map((l) => {
    const promo = getActivePromotionFlags(l.flags, l.vipUntil, (l as any).premiumUntil);
    return {
      ...l,
      images: normalizeImages(l.images),
      flags: promo.flags,
      vipUntil: promo.vipUntil,
      premiumUntil: promo.premiumUntil,
    };
  });
}


export async function getPhoneBrandOptions() {
  const rows = await prisma.phoneDetails.findMany({
    select: { brand: true },
    distinct: ["brand"],
  });
  return rows.map((r) => r.brand).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function getPhoneModelOptions(brand: string) {
  const rows = await prisma.phoneDetails.findMany({
    where: { brand: { equals: brand, mode: "insensitive" } },
    select: { model: true },
    distinct: ["model"],
  });
  return rows.map((r) => r.model).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function getVehicleMakeOptions() {
  const rows = await prisma.vehicleDetails.findMany({
    select: { make: true },
    distinct: ["make"],
  });
  return rows.map((r) => r.make).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function getVehicleModelOptions(make: string) {
  const rows = await prisma.vehicleDetails.findMany({
    where: { make: { equals: make, mode: "insensitive" } },
    select: { model: true },
    distinct: ["model"],
  });
  return rows.map((r) => r.model).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function getListingById(id: string) {
  await archiveExpiredListings();
  const l = await prisma.listing.findUnique({
    where: { id },
    include: { category: true, vehicle: true, realEstate: true, phoneDetails: true },
  });
  if (!l) return null;

  const promo = getActivePromotionFlags(l.flags, l.vipUntil, (l as any).premiumUntil);

  return {
    ...l,
    images: normalizeImages(l.images),
    flags: promo.flags,
    vipUntil: promo.vipUntil,
    premiumUntil: promo.premiumUntil,
  } as any;
}
