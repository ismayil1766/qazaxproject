import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getActiveListings } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ensureCoreCategories } from "@/lib/ensureCoreCategories";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/loginIdentity";
import { normalizeImages } from "@/lib/utils";
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

const CreateSchema = z.object({
  type: z.enum(["VEHICLE", "GENERAL"]),
  title: z.string().min(5),
  description: z.string().min(10),
  price: z.number().int().min(0).optional(),
  currency: z.string().default("AZN").optional(),
  city: z.string().min(2),
  district: z.string().optional(),
  images: z.array(z.string()).default([]).optional(),
  contactName: z.string().min(2),
  phone: z.string().min(6),
  whatsapp: z.string().optional(),
  flags: z.record(z.any()).default({}).optional(),
  categorySlug: z.string().min(1),
  // vehicle fields (optional unless type=VEHICLE)
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

  // phone details
  phoneBrand: z.string().optional(),
  phoneModel: z.string().optional(),
  phoneStorageGb: z.number().int().optional(),
  phoneCondition: z.string().optional(),

  // real estate (optional; used when category is "dasinmaz-emlak" children)
  propertyType: z.string().optional(),
  rooms: z.number().int().optional(),
  areaM2: z.number().int().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q") || undefined;
  const city = searchParams.get("city") || undefined;
  const category = searchParams.get("category") || undefined;

  const make = searchParams.get("make") || undefined;
  const model = searchParams.get("model") || undefined;
  const phoneBrand = searchParams.get("phoneBrand") || undefined;
  const phoneModel = searchParams.get("phoneModel") || undefined;
  const yearFrom = searchParams.get("yearFrom") ? Number(searchParams.get("yearFrom")) : undefined;
  const yearTo = searchParams.get("yearTo") ? Number(searchParams.get("yearTo")) : undefined;
  const rooms = searchParams.get("rooms") ? Number(searchParams.get("rooms")) : undefined;
  const propertyType = searchParams.get("propertyType") || undefined;
  const floor = searchParams.get("floor") ? Number(searchParams.get("floor")) : undefined;

  // `mode: "insensitive"` problemi üçün bütün axtarış logikasını lib/data.ts-ə verdik.
  const items = await getActiveListings({
    type: type === "VEHICLE" || type === "GENERAL" ? (type as any) : undefined,
    q,
    city,
    categorySlug: category || undefined,
    vehicleMake: make,
    vehicleModel: model,
    phoneBrand,
    phoneModel,
    yearFrom: typeof yearFrom === "number" && !Number.isNaN(yearFrom) ? yearFrom : undefined,
    yearTo: typeof yearTo === "number" && !Number.isNaN(yearTo) ? yearTo : undefined,
    rooms: typeof rooms === "number" && !Number.isNaN(rooms) ? rooms : undefined,
    propertyType,
    floor: typeof floor === "number" && !Number.isNaN(floor) ? floor : undefined,
    take: 50,
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  const user = await requireUser(req);
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Məlumatlar düzgün deyil", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const ip = getIp(req);

  const ipLimit = rateLimit(`listing:create:ip:${ip}`, 12, 60 * 60 * 1000);
  if (!ipLimit.ok) return NextResponse.json({ error: "Bu IP-dən cox elan cəhdi oldu. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const userLimit = rateLimit(`listing:create:user:${user.id}`, 5, 24 * 60 * 60 * 1000);
  if (!userLimit.ok) return NextResponse.json({ error: "Bir hesabdan 24 saat ərzində maksimum 5 elan göndərmək olar." }, { status: 429 });

  const pendingCount = await prisma.listing.count({ where: { userId: user.id, status: "PENDING" } });
  if (pendingCount >= 5) {
    return NextResponse.json({ error: "Hazırda 5 pending elanınız var. Əvvəlcə onların moderasiya nəticəsini gözləyin." }, { status: 429 });
  }

  await ensureCoreCategories();
  let cat = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
  if (!cat && data.type === "GENERAL") {
    cat = await prisma.category.findUnique({ where: { slug: "umumi-elan" } });
  }
  if (!cat) return NextResponse.json({ error: "Kateqoriya tapılmadı" }, { status: 400 });

  const parent = cat.parentId ? await prisma.category.findUnique({ where: { id: cat.parentId } }) : null;
  const isRealEstate = parent?.slug === "dasinmaz-emlak" || cat.slug === "dasinmaz-emlak";
  const isPhone = cat.slug === "telefonlar" || cat.slug === "telefon" || cat.slug.includes("telefon");

  const images = normalizeImages(data.images);
  const normalizedPhone = normalizePhone(data.phone);
  if (!normalizedPhone) return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });

  const normalizedWhatsapp = data.whatsapp ? normalizePhone(data.whatsapp) : null;

  const duplicateRecent = await prisma.listing.findFirst({
    where: {
      userId: user.id,
      phone: normalizedPhone,
      title: data.title.trim(),
      createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (duplicateRecent) {
    return NextResponse.json({ error: "Eyni telefon və başlıqla qısa vaxtda təkrar elan göndərmək olmaz." }, { status: 409 });
  }

  const create: any = {
    type: data.type,
    title: data.title.trim(),
    description: data.description.trim(),
    price: data.price,
    currency: data.currency ?? "AZN",
    city: data.city.trim(),
    district: data.district?.trim() || null,
    images: JSON.stringify(images),
    contactName: data.contactName.trim(),
    phone: normalizedPhone,
    whatsapp: normalizedWhatsapp,
    status: "PENDING",
    // VIP/Premium elan yaradılarkən seçilmir. Əgər client təsadüfən göndərsə belə, burada silirik.
    flags: (() => {
      const f: any = { ...(data.flags ?? {}) };
      delete f.vip;
      delete f.premium;
      return JSON.stringify(f);
    })(),
    categoryId: cat.id,
    userId: user.id,
  };

  if (data.type === "VEHICLE") {
    const v = VehicleSchema.safeParse({
      make: data.make,
      model: data.model,
      year: data.year,
      mileageKm: data.mileageKm,
      engine: data.engine,
      fuel: data.fuel,
      transmission: data.transmission,
      bodyType: data.bodyType,
      color: data.color,
      vin: data.vin,
      barter: data.barter ?? false,
      credit: data.credit ?? false,
    });
    if (!v.success) {
      return NextResponse.json({ error: "Avtomobil məlumatları düzgün deyil", details: v.error.flatten() }, { status: 400 });
    }
    create.vehicle = { create: v.data };
  }

  // Optional real-estate details for GENERAL listings in daşınmaz-əmlak categories
  if (data.type === "GENERAL" && isRealEstate) {
    const anyRe =
      data.propertyType ||
      data.rooms != null ||
      data.areaM2 != null ||
      data.floor != null ||
      data.totalFloors != null;

    if (anyRe) {
      const re = RealEstateSchema.safeParse({
        propertyType: data.propertyType,
        rooms: data.rooms,
        areaM2: data.areaM2,
        floor: data.floor,
        totalFloors: data.totalFloors,
      });
      if (!re.success) {
        return NextResponse.json({ error: "Daşınmaz əmlak məlumatları düzgün deyil", details: re.error.flatten() }, { status: 400 });
      }
      create.realEstate = { create: re.data };
    }
  }


  // Optional phone details for GENERAL listings in phone categories
  if (data.type === "GENERAL" && isPhone) {
    const anyPhone = data.phoneBrand || data.phoneModel;
    if (anyPhone) {
      const ph = PhoneSchema.safeParse({
        brand: data.phoneBrand,
        model: data.phoneModel,
        storageGb: data.phoneStorageGb,
        condition: data.phoneCondition,
      });
      if (!ph.success) {
        return NextResponse.json({ error: "Telefon məlumatları düzgün deyil", details: ph.error.flatten() }, { status: 400 });
      }
      create.phoneDetails = { create: ph.data };
    }
  }

  const created = await prisma.listing.create({ data: create });
  return NextResponse.json({ ok: true, id: created.id });
}
