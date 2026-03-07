import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  // Vehicles
  { slug: "avtomobil", nameAz: "Avtomobil", children: [
    { slug: "avtomobil-minik", nameAz: "Minik" },
    { slug: "avtomobil-suv", nameAz: "SUV" },
    { slug: "avtomobil-moto", nameAz: "Motosiklet" },
  ]},

  // General marketplace
  { slug: "elektronika", nameAz: "Elektronika", children: [
    { slug: "telefonlar", nameAz: "Telefonlar" },
    { slug: "noutbuklar", nameAz: "Noutbuklar" },
    { slug: "televizorlar", nameAz: "Televizorlar" },
  ]},
  { slug: "ev-esyalari", nameAz: "Ev əşyaları", children: [
    { slug: "mebel", nameAz: "Mebel" },
    { slug: "metbex", nameAz: "Mətbəx" },
    { slug: "texnika", nameAz: "Məişət texnikası" },
  ]},
  { slug: "xidmetler", nameAz: "Xidmətlər", children: [
    { slug: "temir", nameAz: "Təmir" },
    { slug: "dasinma", nameAz: "Daşınma" },
    { slug: "repetitor", nameAz: "Repetitor" },
  ]},
  { slug: "dasinmaz-emlak", nameAz: "Daşınmaz əmlak", children: [
    { slug: "kiraye", nameAz: "Kirayə" },
    { slug: "satis", nameAz: "Satış" },
  ]},
  { slug: "is-axtaranlar", nameAz: "İş axtaranlar" },
];

async function upsertTree() {
  for (const root of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { nameAz: root.nameAz, parentId: null },
      create: { slug: root.slug, nameAz: root.nameAz },
    });

    if (root.children) {
      for (const ch of root.children) {
        await prisma.category.upsert({
          where: { slug: ch.slug },
          update: { nameAz: ch.nameAz, parentId: parent.id },
          create: { slug: ch.slug, nameAz: ch.nameAz, parentId: parent.id },
        });
      }
    }
  }
}

async function ensureDemoUser() {
  const email = "demo@local.az";
  const passwordHash = await bcrypt.hash("Demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Demo User" },
  });
  return user;
}

async function ensureAdminUser() {
  // Optional: set ADMIN_EMAIL / ADMIN_PASSWORD in env for production
  const email = process.env.ADMIN_EMAIL;
  // Support both ADMIN_PASSWORD and ADMIN_PASS to match the rest of the app.
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;
  if (!email || !password) return null;

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN", name: "Admin" },
  });
  return admin;
}

async function seedListings() {
  const user = await ensureDemoUser();
  const vehicleCat = await prisma.category.findUnique({ where: { slug: "avtomobil-minik" } });
  const phoneCat = await prisma.category.findUnique({ where: { slug: "telefonlar" } });

  if (vehicleCat) {
    await prisma.listing.create({
      data: {
        type: "VEHICLE",
        title: "Toyota Corolla 2014 — yaxşı vəziyyətdə",
        description: "Şəhər içi sürülüb. Yağ vaxtında dəyişilib. Barter yox. Real alıcıya endirim var.",
        price: 18500,
        city: "Gəncə",
        district: "Mərkəz",
        images: JSON.stringify(["https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80"]),
        contactName: "Rəşad",
        phone: "+994501112233",
        whatsapp: "+994501112233",
        status: "ACTIVE",
        flags: JSON.stringify({ urgent: true, vip: true }),
        categoryId: vehicleCat.id,
        userId: user.id,
        vehicle: {
          create: {
            make: "Toyota",
            model: "Corolla",
            year: 2014,
            mileageKm: 168000,
            fuel: "Benzin",
            transmission: "Avtomat",
            bodyType: "Sedan",
            color: "Ağ",
            credit: false,
            barter: false
          }
        }
      }
    });
  }

  if (phoneCat) {
    await prisma.listing.create({
      data: {
        type: "GENERAL",
        title: "iPhone 12 128GB — problemsiz",
        description: "Batareya 86%. Usta üzü görməyib. Qutu + kabel var.",
        price: 850,
        city: "Gəncə",
        images: JSON.stringify(["https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=1200&q=80"]),
        contactName: "Aysel",
        phone: "+994703334455",
        whatsapp: "+994703334455",
        status: "ACTIVE",
        flags: JSON.stringify({ premium: true }),
        categoryId: phoneCat.id,
        userId: user.id,
      }
    });
  }
}

async function main() {
  await upsertTree();
  await ensureAdminUser();
  const count = await prisma.listing.count();
  if (count === 0) {
    await seedListings();
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
