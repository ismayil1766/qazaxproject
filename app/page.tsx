import Link from "next/link";
import { getCategories, getActiveListings } from "@/lib/data";
import { ListingCard } from "@/components/ListingCard";
import { CITIES, normalizeCity } from "@/lib/cities";

// DB oxunuşu var (Prisma). Build zamanı DATABASE_URL olmaya bilər, ona görə
// bu səhifəni statik prerender etmirik.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams: { q?: string; city?: string } }) {
  const q = searchParams?.q ?? "";
  const city = searchParams?.city ?? "";
  const cityNorm = normalizeCity(city);
  const [categories, listings] = await Promise.all([
    getCategories(),
    getActiveListings({ q, city: cityNorm, take: 18 }),
  ]);

  const vip = listings.filter((l: any) => (l.flags?.vip ?? false)).slice(0, 6);
  const premium = listings.filter((l: any) => (l.flags?.premium ?? false)).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl border bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Qazax və Ağstafa Şəhərləri üçün elan platforması</h1>
          <p className="text-sm text-zinc-600">Avtomobil, əşya, xidmət və iş axtaran elanlarını rahat tapın.</p>
        </div>

        <form className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3" action="/" method="get">
          <input name="q" defaultValue={q} placeholder="Axtarış: Toyota, iPhone, divan..." className="ui-input" />
          <select name="city" defaultValue={cityNorm ?? ""} className="ui-input">
            <option value="">Bütün şəhərlər</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="ui-btn-primary px-4 py-3">Axtar</button>
        </form>

        {/* Mobile: horizontal chips, Desktop: grid */}
        <div className="mt-5 sm:mt-6">
          <div className="sm:hidden -mx-5 px-5 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={
                    c.slug === "avtomobil"
                      ? "/elanlar?tab=vehicle"
                      : c.slug === "dasinmaz-emlak"
                      ? "/elanlar?tab=realestate&category=dasinmaz-emlak"
                      : c.slug === "telefonlar"
                      ? "/elanlar?tab=phone&category=telefonlar"
                      : c.slug === "is-axtaranlar"
                      ? "/elanlar?tab=jobseekers&category=is-axtaranlar"
                      : `/elanlar?tab=general&category=${c.slug}`
                  }
                  className="ui-chip whitespace-nowrap"
                >
                  <span className="font-medium">{c.nameAz}</span>
                  <span className="text-xs text-zinc-500">({c.children.length})</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-2 md:grid-cols-5 gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={
                  c.slug === "avtomobil"
                    ? "/elanlar?tab=vehicle"
                    : c.slug === "dasinmaz-emlak"
                    ? "/elanlar?tab=realestate&category=dasinmaz-emlak"
                    : c.slug === "telefonlar"
                    ? "/elanlar?tab=phone&category=telefonlar"
                    : c.slug === "is-axtaranlar"
                    ? "/elanlar?tab=jobseekers&category=is-axtaranlar"
                    : `/elanlar?tab=general&category=${c.slug}`
                }
                className="rounded-2xl border px-3 py-3 hover:bg-zinc-50 transition"
              >
                <div className="font-medium">{c.nameAz}</div>
                <div className="text-xs text-zinc-600">{c.children.length} alt bölmə</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {vip.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">VIP elanlar</h2>
            <Link href="/elanlar?tab=general" className="text-sm text-zinc-600 hover:underline">Hamısı</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vip.map((l: any) => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      ) : null}

      {premium.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Premium elanlar</h2>
            <Link href="/elanlar?tab=general" className="text-sm text-zinc-600 hover:underline">Hamısı</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {premium.map((l: any) => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Son elanlar</h2>
          <Link href="/elanlar?tab=general" className="text-sm text-zinc-600 hover:underline">Elanlar bölməsi</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {listings.slice(0, 9).map((l: any) => <ListingCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  );
}
