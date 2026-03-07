import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/data";
import { getUserFromRequest } from "@/lib/auth";
import { normalizeFlags, normalizeImages } from "@/lib/utils";
import { NewListingForm } from "@/components/NewListingForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cookieHeaderFromNextCookies() {
  const all = cookies().getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const cookieHeader = cookieHeaderFromNextCookies();
  const user = await getUserFromRequest(new Request("http://local/elan-duzelt", { headers: { cookie: cookieHeader } }));

  if (!user) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Daxil olmaq lazımdır</h1>
        <p className="mt-2 text-zinc-600">Elanı düzəltmək üçün əvvəlcə hesabına daxil ol.</p>
        <Link href={`/daxil-ol?next=${encodeURIComponent(`/elan-duzelt/${params.id}`)}`} className="mt-4 inline-flex ui-btn-primary px-4 py-2">
          Daxil ol
        </Link>
      </div>
    );
  }

  const categories = await getCategories();
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { vehicle: true, realEstate: true, phoneDetails: true, category: true },
  });

  if (!listing) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Elan tapılmadı</h1>
      </div>
    );
  }

  if (listing.userId !== user.id && user.role !== "ADMIN") {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">İcazə yoxdur</h1>
        <p className="mt-2 text-zinc-600">Bu elanı yalnız sahibi düzəldə bilər.</p>
      </div>
    );
  }

  const normalizedListing = {
    ...listing,
    images: normalizeImages(listing.images),
    flags: normalizeFlags(listing.flags),
  };

  return (
    <div className="rounded-3xl border bg-white p-6">
      <h1 className="text-2xl font-semibold">Elanı düzəlt</h1>
      <p className="mt-2 text-zinc-600">Dəyişiklik etdikdən sonra elan yenidən moderasiyaya düşəcək.</p>
      <div className="mt-6">
        <NewListingForm categories={categories as any} initial={normalizedListing as any} />
      </div>
    </div>
  );
}
