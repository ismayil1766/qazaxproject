import {
  getCategories,
  getActiveListings,
  getVehicleMakeOptions,
  getVehicleModelOptions,
  getPhoneBrandOptions,
  getPhoneModelOptions,
} from "@/lib/data";
import { ListingCard } from "@/components/ListingCard";
import { normalizeCity } from "@/lib/cities";
import { uniqSorted } from "@/lib/vehicleCatalog";
import { ListingsFiltersClient } from "@/components/ListingsFiltersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  tab?: string;
  q?: string;
  city?: string;
  category?: string;
  // vehicle
  make?: string;
  model?: string;
  yearFrom?: string;
  yearTo?: string;
  // real estate
  rooms?: string;
  propertyType?: string;
  floor?: string;
  // phone
  phoneBrand?: string;
  phoneModel?: string;
};

export default async function Listings({ searchParams }: { searchParams: SearchParams }) {
  const tab = (searchParams?.tab as string) || "general"; // general | vehicle | realestate | phone | jobseekers

  const q = searchParams?.q ?? "";
  const city = searchParams?.city ?? "";
  // normalizeCity can return undefined for unknown/empty values; keep the filter prop strictly string
  const cityNorm = normalizeCity(city) ?? "";
  const cityForQuery = cityNorm || undefined;

  const category = searchParams?.category ?? "";
  const categoryForTab = tab === "vehicle" ? (category || "avtomobil-minik") : tab === "realestate" ? (category || "dasinmaz-emlak") : tab === "phone" ? (category || "telefonlar") : tab === "jobseekers" ? (category || "is-axtaranlar") : category;

  // vehicle
  const make = searchParams?.make ?? "";
  const model = searchParams?.model ?? "";

  // phone
  const phoneBrand = searchParams?.phoneBrand ?? "";
  const phoneModel = searchParams?.phoneModel ?? "";
  const yearFrom = searchParams?.yearFrom ? Number(searchParams.yearFrom) : undefined;
  const yearTo = searchParams?.yearTo ? Number(searchParams.yearTo) : undefined;

  // real estate
  const rooms = searchParams?.rooms ? Number(searchParams.rooms) : undefined;
  const propertyType = searchParams?.propertyType ?? "";
  const floor = searchParams?.floor ? Number(searchParams.floor) : undefined;

  const isMoto = tab === "vehicle" && (category || "").includes("moto");

  const [cats, listings, dbMakes, dbModels, dbPhoneBrands, dbPhoneModels] = await Promise.all([
    getCategories(),

    tab === "vehicle"
      ? getActiveListings({
          type: "VEHICLE",
          q,
          city: cityForQuery,
          // default minik if none selected
          categorySlug: category || "avtomobil-minik",
          // moto listings should not require make/model filters
          vehicleMake: !isMoto && make ? make : undefined,
          vehicleModel: !isMoto && model ? model : undefined,
          yearFrom: typeof yearFrom === "number" && !Number.isNaN(yearFrom) ? yearFrom : undefined,
          yearTo: typeof yearTo === "number" && !Number.isNaN(yearTo) ? yearTo : undefined,
          take: 30,
        })
      : getActiveListings({
          type: "GENERAL",
          q,
          city: cityForQuery,
          // for real-estate tab, default to the root so it includes kiraye+satis
          categorySlug: tab === "realestate" ? category || "dasinmaz-emlak" : tab === "phone" ? category || "telefonlar" : tab === "jobseekers" ? category || "is-axtaranlar" : category || undefined,
          rooms: typeof rooms === "number" && !Number.isNaN(rooms) ? rooms : undefined,
          propertyType: propertyType || undefined,
          floor: typeof floor === "number" && !Number.isNaN(floor) ? floor : undefined,
          phoneBrand: tab === "phone" && phoneBrand ? phoneBrand : undefined,
          phoneModel: tab === "phone" && phoneModel ? phoneModel : undefined,
          take: 30,
        }),

    tab === "vehicle" ? getVehicleMakeOptions() : Promise.resolve([] as string[]),
    tab === "vehicle" && !isMoto && make ? getVehicleModelOptions(make) : Promise.resolve([] as string[]),
    tab === "phone" ? getPhoneBrandOptions() : Promise.resolve([] as string[]),
    tab === "phone" && phoneBrand ? getPhoneModelOptions(phoneBrand) : Promise.resolve([] as string[]),
  ]);

  const vehicleRoot = cats.find((c) => c.slug === "avtomobil");
  const realEstateRoot = cats.find((c) => c.slug === "dasinmaz-emlak");

  const generalRoots = cats.filter((c) => c.slug !== "avtomobil" && c.slug !== "dasinmaz-emlak" && c.slug !== "is-axtaranlar");

  const categoryOptions: { key: string; value: string; label: string }[] =
    tab === "vehicle"
      ? (vehicleRoot?.children ?? []).map((c: any) => ({ key: c.id, value: c.slug, label: c.nameAz }))
      : tab === "realestate"
      ? (() => {
          const r: any = realEstateRoot;
          if (!r) return [];
          const out = [{ key: r.id, value: r.slug, label: `${r.nameAz} (hamısı)` }];
          for (const ch of r.children ?? []) out.push({ key: ch.id, value: ch.slug, label: `— ${ch.nameAz}` });
          return out;
        })()
      : tab === "phone"
      ? (() => {
          // Try to find the "telefonlar" category (usually under Elektronika)
          const found = (cats as any[])
            .flatMap((r: any) => [r, ...(r.children ?? [])])
            .find((c: any) => c.slug === "telefonlar");
          if (!found) return [];
          return [{ key: found.id, value: found.slug, label: found.nameAz }];
        })()
      : tab === "jobseekers"
      ? (() => {
          const found = (cats as any[]).find((c: any) => c.slug === "is-axtaranlar");
          if (!found) return [];
          return [{ key: found.id, value: found.slug, label: found.nameAz }];
        })()
      : generalRoots.flatMap((r: any) => {
          const hasChildren = (r.children ?? []).length > 0;
          const out: { key: string; value: string; label: string }[] = [];
          out.push({ key: r.id, value: r.slug, label: hasChildren ? `${r.nameAz} (hamısı)` : r.nameAz });
          for (const ch of r.children ?? []) out.push({ key: ch.id, value: ch.slug, label: `— ${ch.nameAz}` });
          return out;
        });

  // Vehicle dropdowns: client will load the full Turbo.az list; we keep DB values as fallback.
  const makeOptions = uniqSorted([...(dbMakes || [])]);
  const modelOptions = make ? uniqSorted([...(dbModels || [])]) : [];

  // Phone brands: client will load the Tap.az list; keep DB values as fallback.
  const phoneBrandOptions = uniqSorted([...(dbPhoneBrands || [])]);
  const phoneModelOptions = phoneBrand ? uniqSorted([...(dbPhoneModels || [])]) : [];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));

  // If moto, don't show make/model (as requested)

  function tabHref(nextTab: "general" | "vehicle" | "realestate" | "phone" | "jobseekers") {
    const sp = new URLSearchParams();
    sp.set("tab", nextTab);
    if (q) sp.set("q", q);
    if (cityNorm) sp.set("city", cityNorm);

    // sensible defaults per tab
    if (nextTab === "vehicle") {
      sp.set("category", "avtomobil-minik");
    }
    if (nextTab === "realestate") {
      sp.set("category", "dasinmaz-emlak");
    }
    if (nextTab === "phone") {
      sp.set("category", "telefonlar");
    }
    if (nextTab === "jobseekers") {
      sp.set("category", "is-axtaranlar");
    }

    return `/elanlar?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Elanlar</h1>
        <p className="mt-2 text-zinc-600">Kateqoriya və axtarış vasitəsilə elanları tap.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={tabHref("general")} className={tab === "general" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Ümumi elanlar
          </a>
          <a href={tabHref("vehicle")} className={tab === "vehicle" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Avtomobil elanları
          </a>
          <a href={tabHref("realestate")} className={tab === "realestate" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Daşınmaz əmlak
          </a>
          <a href={tabHref("phone")} className={tab === "phone" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Telefonlar
          </a>
          <a href={tabHref("jobseekers")} className={tab === "jobseekers" ? "ui-pill ui-pill-active" : "ui-pill"}>
            İş axtaranlar
          </a>
        </div>

        <ListingsFiltersClient
          tab={tab as any}
          q={q}
          city={cityNorm}
          category={categoryForTab}
          categoryOptions={categoryOptions}
          make={make}
          model={model}
          makeOptions={makeOptions}
          initialModelOptions={modelOptions}
          yearFrom={searchParams?.yearFrom ?? ""}
          yearTo={searchParams?.yearTo ?? ""}
          yearOptions={yearOptions}
          propertyType={propertyType}
          rooms={searchParams?.rooms ?? ""}
          floor={searchParams?.floor ?? ""}
          phoneBrand={phoneBrand}
          phoneModel={phoneModel}
          phoneBrandOptions={phoneBrandOptions}
          initialPhoneModelOptions={phoneModelOptions}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {listings.map((l: any) => (
          <ListingCard key={l.id} l={l} />
        ))}
      </div>
    </div>
  );
}
