import { prisma } from "@/lib/db";

type CategoryNode = {
  slug: string;
  nameAz: string;
  children?: CategoryNode[];
};

const CORE_CATEGORIES: CategoryNode[] = [
  {
    slug: "umumi-elan",
    nameAz: "Ümumi elan",
  },
  {
    slug: "is-axtaranlar",
    nameAz: "İş axtaranlar",
  },
];

export async function ensureCoreCategories() {
  for (const root of CORE_CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { nameAz: root.nameAz, parentId: null },
      create: { slug: root.slug, nameAz: root.nameAz },
    });

    for (const child of root.children ?? []) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { nameAz: child.nameAz, parentId: parent.id },
        create: { slug: child.slug, nameAz: child.nameAz, parentId: parent.id },
      });
    }
  }
}
