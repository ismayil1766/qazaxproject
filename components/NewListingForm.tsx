"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/cities";
import { uniqSorted } from "@/lib/uniq";

type Category = { id: string; slug: string; nameAz: string; children: Category[] };
type User = { id: string; email: string; name?: string | null } | null;

type InitialListing = {
  id: string;
  type: "VEHICLE" | "GENERAL";
  title: string;
  description: string;
  price: number | null;
  currency: string;
  city: string;
  district: string | null;
  images: any;
  contactName: string;
  phone: string;
  whatsapp: string | null;
  flags: any;
  category: { slug: string };
  vehicle?: any | null;
  realEstate?: any | null;
  // NOTE: Listing.phone is the contact phone string; phone listing details live in this relation.
  phoneDetails?: any | null;
};

function flatten(root: Category[]): Category[] {
  const out: Category[] = [];
  for (const r of root) {
    out.push(r);
    for (const c of r.children ?? []) out.push(c);
  }
  return out;
}

export function NewListingForm({ categories, initial }: { categories: Category[]; initial?: InitialListing }) {
  const router = useRouter();
  const all = useMemo(() => flatten(categories), [categories]);

  const vehicleChildren = useMemo(
    () => categories.find((c) => c.slug === "avtomobil")?.children ?? [],
    [categories]
  );
  const realEstateChildren = useMemo(
    () => categories.find((c) => c.slug === "dasinmaz-emlak")?.children ?? [],
    [categories]
  );

  // General categories exclude vehicle + real-estate (real-estate has its own section in this form)
  const generalCats = categories
    .filter((c) => c.slug !== "avtomobil" && c.slug !== "dasinmaz-emlak" && c.slug !== "telefonlar" && c.slug !== "is-axtaranlar")
    .flatMap((r) => (r.children.length ? r.children : [r]));

  const phoneCats = useMemo(
    () => all.filter((c) => c.slug === "telefonlar" || c.slug.includes("telefon")),
    [all]
  );
  const jobSeekerCats = useMemo(
    () => all.filter((c) => c.slug === "is-axtaranlar"),
    [all]
  );

  type Section = "VEHICLE" | "REAL_ESTATE" | "PHONE" | "JOB_SEEKER" | "GENERAL";
  const initialIsRealEstate = (() => {
    const slug = initial?.category?.slug;
    if (!slug) return false;
    if (slug === "dasinmaz-emlak") return true;
    return realEstateChildren.some((c) => c.slug === slug);
  })();

  const initialIsPhone = (() => {
    const slug = initial?.category?.slug;
    // NOTE: Listing.phone is the contact phone string; phone listing details live in phoneDetails relation.
    if (initial?.phoneDetails) return true;
    if (!slug) return false;
    return slug === "telefonlar" || slug === "telefon" || slug.includes("telefon");
  })();

  const [section, setSection] = useState<Section>(() => {
    if (initial?.type === "VEHICLE") return "VEHICLE";
    if (initialIsRealEstate) return "REAL_ESTATE";
    if (initialIsPhone) return "PHONE";
    if (initial?.category?.slug === "is-axtaranlar") return "JOB_SEEKER";
    return "GENERAL";
  });

  const type: "VEHICLE" | "GENERAL" = section === "VEHICLE" ? "VEHICLE" : "GENERAL";
  const [categorySlug, setCategorySlug] = useState<string>(() => {
    if (initial?.category?.slug) return initial.category.slug;
    const firstVehicle = vehicleChildren[0]?.slug;
    const firstRealEstate = realEstateChildren[0]?.slug;
    const firstGeneral = generalCats[0]?.slug;
    if ((initial?.type ?? "VEHICLE") === "VEHICLE") return firstVehicle || "avtomobil-minik";
    if (initialIsRealEstate) return firstRealEstate || "dasinmaz-emlak";
    if (initialIsPhone) return "telefonlar";
    if (initial?.category?.slug === "is-axtaranlar") return "is-axtaranlar";
    return firstGeneral || "umumi-elan";
  });

  // When user switches main section, pick a sensible default category.
  useEffect(() => {
    if (section === "VEHICLE") {
      setCategorySlug((prev) => (prev ? prev : vehicleChildren[0]?.slug || "avtomobil-minik"));
      return;
    }
    if (section === "REAL_ESTATE") {
      setCategorySlug("dasinmaz-emlak");
      return;
    }
    if (section === "PHONE") {
      setCategorySlug("telefonlar");
      return;
    }
    if (section === "JOB_SEEKER") {
      setCategorySlug("is-axtaranlar");
      return;
    }
    // GENERAL: keep the current category only if it belongs to general categories.
    setCategorySlug((prev) => {
      const hasPrev = generalCats.some((c) => c.slug === prev);
      return hasPrev ? prev : generalCats[0]?.slug || "umumi-elan";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, generalCats]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string>("");
  const [user, setUser] = useState<User>(null);
  const [loaded, setLoaded] = useState(false);

  const [existingImages, setExistingImages] = useState<string[]>(() => {
    const arr = Array.isArray(initial?.images) ? (initial?.images as any[]) : [];
    return (arr || []).slice(0, 12) as string[];
  });

  // Vehicle dropdown helpers (client-side)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const out: string[] = [];
    for (let y = currentYear; y >= 1950; y--) out.push(String(y));
    return out;
  }, [currentYear]);

  const [makeOptionsRaw, setMakeOptionsRaw] = useState<string[]>([]);
  const [vehicleMake, setVehicleMake] = useState<string>(initial?.vehicle?.make ?? "");
  const [vehicleModel, setVehicleModel] = useState<string>(initial?.vehicle?.model ?? "");
  const makeOptions = useMemo(
    () => uniqSorted([...(makeOptionsRaw || []), vehicleMake].filter(Boolean)),
    [makeOptionsRaw, vehicleMake]
  );

  const [phoneBrand, setPhoneBrand] = useState<string>(initial?.phoneDetails?.brand ?? "");
  const [phoneModel, setPhoneModel] = useState<string>(initial?.phoneDetails?.model ?? "");
  const [phoneBrandOptionsRaw, setPhoneBrandOptionsRaw] = useState<string[]>([]);
  const [phoneModelOptionsRaw, setPhoneModelOptionsRaw] = useState<string[]>([]);
  const phoneBrandOptions = useMemo(
    () => uniqSorted([...(phoneBrandOptionsRaw || []), phoneBrand].filter(Boolean)),
    [phoneBrandOptionsRaw, phoneBrand]
  );
  const phoneModelOptions = useMemo(
    () => uniqSorted([...(phoneModelOptionsRaw || []), phoneModel].filter(Boolean)),
    [phoneModelOptionsRaw, phoneModel]
  );
  const firstPhoneModelsFetch = useRef(true);

  // Pull up-to-date make/brand lists from Turbo.az / Tap.az via our backend.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/vehicles/makes", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setMakeOptionsRaw(Array.isArray(d?.makes) ? d.makes : []))
      .catch(() => {});

    fetch("/api/phones/brands", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setPhoneBrandOptionsRaw(Array.isArray(d?.brands) ? d.brands : []))
      .catch(() => {});

    return () => ctrl.abort();
  }, []);


  const isMotoListing = type === "VEHICLE" && categorySlug.includes("moto");

  const isRealEstateSelected = useMemo(() => {
    if (categorySlug === "dasinmaz-emlak") return true;
    return realEstateChildren.some((c) => c.slug === categorySlug);
  }, [categorySlug, realEstateChildren]);

  const [modelOptionsRaw, setModelOptionsRaw] = useState<string[]>([]);
  const modelOptions = useMemo(
    () => uniqSorted([...(modelOptionsRaw || []), vehicleModel].filter(Boolean)),
    [modelOptionsRaw, vehicleModel]
  );
  const firstVehicleModelsFetch = useRef(true);


  // Fetch models when make changes (server merges JSON + DB).
  useEffect(() => {
    if (!vehicleMake) {
      setVehicleModel("");
      setModelOptionsRaw([]);
      return;
    }
    if (isMotoListing) {
      setVehicleMake("");
      setVehicleModel("");
      setModelOptionsRaw([]);
      return;
    }

    if (!firstVehicleModelsFetch.current) setVehicleModel("");

    const ctrl = new AbortController();
    fetch(`/api/vehicles/models?make=${encodeURIComponent(vehicleMake)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.models) ? d.models : [];
        setModelOptionsRaw(list);
        firstVehicleModelsFetch.current = false;
      })
      .catch(() => {
        firstVehicleModelsFetch.current = false;
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleMake, isMotoListing]);

  
  // Fetch phone models when brand changes.
  useEffect(() => {
    if (section !== "PHONE") return;
    if (!phoneBrand) {
      setPhoneModel("");
      setPhoneModelOptionsRaw([]);
      return;
    }
    if (!firstPhoneModelsFetch.current) setPhoneModel("");

    const ctrl = new AbortController();
    fetch(`/api/phones/models?brand=${encodeURIComponent(phoneBrand)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.models) ? d.models : [];
        setPhoneModelOptionsRaw(list);
        firstPhoneModelsFetch.current = false;
      })
      .catch(() => {
        firstPhoneModelsFetch.current = false;
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneBrand, section]);
useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    // React event object bəzi hallarda async əməliyyatlardan sonra null ola bilər.
    // Ona görə form elementini əvvəlcədən saxlayırıq.
    const formEl = e.currentTarget;

    const fd = new FormData(formEl);

    // 1) Upload new images first (if selected)
    const files = fd.getAll("files").filter(Boolean) as File[];
    let imageUrls: string[] = [];

    if (files.length) {
      const up = new FormData();
      for (const f of files.slice(0, 12)) up.append("files", f);

      const upRes = await fetch("/api/upload", { method: "POST", body: up });
      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        setStatus("err");
        setMsg(upData?.error || "Şəkil yükləmə xətası");
        return;
      }
      imageUrls = upData.urls || [];
    }

    // 2) Build listing payload
    const payload: any = Object.fromEntries(fd.entries());
    payload.type = type;
    payload.categorySlug = payload.categorySlug || categorySlug;
    if (section === "PHONE") {
      payload.phoneBrand = phoneBrand;
      payload.phoneModel = phoneModel;
    }
    payload.images = [...existingImages, ...imageUrls].slice(0, 12);

    // If the user selected motorcycle category, we don't force make/model selection in the UI.
    // DB schema requires non-empty make/model, so we set safe placeholders.
    if (payload.type === "VEHICLE" && String(payload.categorySlug || "").includes("moto")) {
      payload.make = "Motosiklet";
      payload.model = "Motosiklet";
    }

    // flags
    // VIP/Premium artıq elan yerləşdiriləndə seçilmir. User sonradan "Elanlarım" bölməsindən aktivləşdirir.
    payload.flags = {
      urgent: Boolean(payload.urgent),
    };
    delete payload.urgent;

    // numbers
    const numFields = ["price", "year", "mileageKm", "rooms", "areaM2", "floor", "totalFloors"];
    for (const f of numFields) {
      if (payload[f] === "" || payload[f] == null) delete payload[f];
      else payload[f] = Number(payload[f]);
    }

    // booleans
    payload.credit = Boolean(payload.credit);
    payload.barter = Boolean(payload.barter);

    try {
      const res = await fetch(initial ? `/api/listings/${encodeURIComponent(initial.id)}` : "/api/listings", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/daxil-ol?next=${encodeURIComponent(initial ? `/elan-duzelt/${initial.id}` : "/yeni")}`);
        return;
      }
      if (!res.ok) {
        // Zod default error-ları (EN) user üçün anlaşılmaz olur.
        // İlk field error-u tapıb AZ dilinə daha oxunaqlı mesaj edirik.
        const fieldErrors: Record<string, string[] | undefined> | undefined = data?.details?.fieldErrors;

        const fieldLabel: Record<string, string> = {
          title: "Başlıq",
          description: "Təsvir",
          city: "Şəhər",
          district: "Rayon",
          contactName: "Əlaqə adı",
          phone: "Telefon",
          whatsapp: "WhatsApp",
          categorySlug: "Kateqoriya",
          make: "Marka",
          model: "Model",
          year: "İl",
          mileageKm: "Yürüş",
          rooms: "Otaq sayı",
          areaM2: "Sahə",
          propertyType: "Əmlak növü",
        };

        function translateZod(field: string, msg: string) {
          const label = fieldLabel[field] || field;

          const min = msg.match(/at least\s+(\d+)/i);
          if (min) return `${label} minimum ${min[1]} simvol olmalıdır`;

          const max = msg.match(/at most\s+(\d+)/i);
          if (max) return `${label} maksimum ${max[1]} simvol ola bilər`;

          if (/expected number/i.test(msg)) return `${label} rəqəm olmalıdır`;
          if (/expected boolean/i.test(msg)) return `${label} düzgün seçilməlidir`;
          if (/required/i.test(msg)) return `${label} tələb olunur`;

          return msg;
        }

        let niceErr: string | null = null;
        if (fieldErrors) {
          for (const [field, arr] of Object.entries(fieldErrors)) {
            const m = Array.isArray(arr) ? arr.filter(Boolean)[0] : null;
            if (m) {
              niceErr = translateZod(field, String(m));
              break;
            }
          }
        }

        throw new Error(niceErr ? `${data?.error || "Xəta"}: ${niceErr}` : data?.error || "Xəta");
      }

      setStatus("ok");
      setMsg(initial ? "Dəyişikliklər göndərildi. Elan yenidən moderasiyaya düşdü." : "Elan göndərildi. Moderasiya sonrası aktiv olacaq.");
      if (!initial) {
        // formEl null olmaz, ona görə burda təhlükəsizdir
        formEl.reset();
        setExistingImages([]);
      } else {
        router.push("/profil?tab=elanlarim");
      }
    } catch (err: any) {
      setStatus("err");
      setMsg(err?.message || "Xəta");
    }
  }

  if (!loaded) {
    return <div className="text-sm text-zinc-600">Yüklənir…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border p-5 bg-white">
        <h2 className="text-lg font-semibold mb-1">Elan yerləşdirmək üçün daxil olun</h2>
        <p className="text-sm text-zinc-600 mb-4">
          Sayta baxmaq sərbəstdir. Amma elan əlavə etmək üçün hesab lazımdır.
        </p>
        <div className="flex gap-2">
          <Link
            href={`/daxil-ol?next=${encodeURIComponent(initial ? `/elan-duzelt/${initial.id}` : "/yeni")}`}
            className="ui-btn-primary px-4 py-2"
          >
            Daxil ol
          </Link>
          <Link
            href={`/qeydiyyat?next=${encodeURIComponent(initial ? `/elan-duzelt/${initial.id}` : "/yeni")}`}
            className="ui-btn-outline px-4 py-2"
          >
            Qeydiyyat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSection("VEHICLE");
            setCategorySlug(vehicleChildren[0]?.slug || "avtomobil-minik");
          }}
          className={section === "VEHICLE" ? "ui-btn-primary px-4 py-2" : "ui-btn-outline px-4 py-2"}
        >
          Avtomobil
        </button>
        <button
          type="button"
          onClick={() => {
            setSection("REAL_ESTATE");
            setCategorySlug(realEstateChildren[0]?.slug || "dasinmaz-emlak");
          }}
          className={section === "REAL_ESTATE" ? "ui-btn-primary px-4 py-2" : "ui-btn-outline px-4 py-2"}
        >
          Daşınmaz əmlak
        </button>
        <button
          type="button"
          onClick={() => {
            setSection("PHONE");
            setCategorySlug("telefonlar");
          }}
          className={section === "PHONE" ? "ui-btn-primary px-4 py-2" : "ui-btn-outline px-4 py-2"}
        >
          Telefon
        </button>

        <button
          type="button"
          onClick={() => {
            setSection("GENERAL");
            setCategorySlug(generalCats[0]?.slug || "umumi-elan");
          }}
          className={section === "GENERAL" ? "ui-btn-primary px-4 py-2" : "ui-btn-outline px-4 py-2"}
        >
          Ümumi elan
        </button>

        <button
          type="button"
          onClick={() => {
            setSection("JOB_SEEKER");
            setCategorySlug("is-axtaranlar");
          }}
          className={section === "JOB_SEEKER" ? "ui-btn-primary px-4 py-2" : "ui-btn-outline px-4 py-2"}
        >
          İş axtaranlar
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">
          Başlıq
	          <input defaultValue={initial?.title ?? ""} name="title" required minLength={5} className="ui-input mt-1" />
        </label>

	        <label className="text-sm">
	          Kateqoriya
	          <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              name="categorySlug"
              required
              className="ui-input mt-1"
            >
            {(section === "VEHICLE"
              ? vehicleChildren
              : section === "REAL_ESTATE"
              ? realEstateChildren
              : section === "PHONE"
              ? phoneCats
              : section === "JOB_SEEKER"
              ? jobSeekerCats
              : generalCats
            ).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nameAz}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Şəhər
	          <select
            defaultValue={initial?.city ?? "Qazax"}
            name="city"
            required
            className="ui-input mt-1"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Rayon
	          <input defaultValue={initial?.district ?? ""} name="district" className="ui-input mt-1" placeholder="Məs: Mərkəz" />
        </label>

        <label className="text-sm">
          Qiymət (AZN)
	          <input defaultValue={initial?.price ?? ""} name="price" type="number" min={0} className="ui-input mt-1" />
        </label>

        <label className="text-sm">
          WhatsApp
	          <input defaultValue={initial?.whatsapp ?? ""} name="whatsapp" className="ui-input mt-1" placeholder="+994..." />
        </label>

        <label className="text-sm">
          Əlaqə adı
	          <input defaultValue={initial?.contactName ?? ""} name="contactName" required className="ui-input mt-1" />
        </label>

        <label className="text-sm">
          Telefon
	          <input defaultValue={initial?.phone ?? ""} name="phone" required className="ui-input mt-1" placeholder="+994..." />
        </label>
      </div>

      {section === "PHONE" ? (
        <div className="rounded-2xl border p-4 bg-white">
          <div className="font-semibold mb-3">Telefon məlumatları</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Marka
              <select
                className="ui-input mt-1"
                value={phoneBrand}
                onChange={(e) => setPhoneBrand(e.target.value)}
                required
              >
                <option value="">Marka seçin…</option>
                {phoneBrandOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Model
              <select
                className="ui-input mt-1"
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                disabled={!phoneBrand}
                required
              >
                <option value="">{phoneBrand ? "Model seçin…" : "Əvvəl marka seçin"}</option>
                {phoneModelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {type === "VEHICLE" ? (
        <div className="rounded-2xl border p-4 bg-white">
          <div className="font-semibold mb-3">Avtomobil məlumatları</div>
          <div className="grid md:grid-cols-3 gap-4">
            {!isMotoListing ? (
              <>
                <label className="text-sm">
                  Marka
                  <select
                    name="make"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    required
                    className="ui-input mt-1"
                  >
                    <option value="">Marka seçin…</option>
                    {makeOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Model
                  <select
                    name="model"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                    disabled={!vehicleMake}
                    className="ui-input mt-1"
                  >
                    <option value="">{vehicleMake ? "Model seçin…" : "Əvvəl marka seçin"}</option>
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <div className="md:col-span-2 text-sm text-zinc-600 flex items-center">
                Motosiklet elanlarında marka/model seçimi tələb olunmur.
              </div>
            )}
            <label className="text-sm">
              İl
	              <select defaultValue={String(initial?.vehicle?.year ?? "")} name="year" required className="ui-input mt-1">
                <option value="">İl seç…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Yürüş (km)
	              <input defaultValue={initial?.vehicle?.mileageKm ?? ""} name="mileageKm" type="number" min={0} className="ui-input mt-1" />
            </label>
            <label className="text-sm">
              Yanacaq
	              <input defaultValue={initial?.vehicle?.fuel ?? ""} name="fuel" className="ui-input mt-1" placeholder="Benzin / Dizel..." />
            </label>
            <label className="text-sm">
              Sürətlər qutusu
	              <input defaultValue={initial?.vehicle?.transmission ?? ""} name="transmission" className="ui-input mt-1" placeholder="Avtomat / Mexanika" />
            </label>

            <label className="text-sm">
              Ban növü
	              <input defaultValue={initial?.vehicle?.bodyType ?? ""} name="bodyType" className="ui-input mt-1" placeholder="Sedan / SUV..." />
            </label>
            <label className="text-sm">
              Rəng
	              <input defaultValue={initial?.vehicle?.color ?? ""} name="color" className="ui-input mt-1" />
            </label>
            <label className="text-sm">
              Mühərrik
	              <input defaultValue={initial?.vehicle?.engine ?? ""} name="engine" className="ui-input mt-1" placeholder="1.6 / 2.0..." />
            </label>

	            <label className="text-sm flex items-center gap-2 mt-2">
	              <input defaultChecked={Boolean(initial?.vehicle?.credit)} name="credit" type="checkbox" className="rounded" /> Kredit
            </label>
	            <label className="text-sm flex items-center gap-2 mt-2">
	              <input defaultChecked={Boolean(initial?.vehicle?.barter)} name="barter" type="checkbox" className="rounded" /> Barter
            </label>
          </div>
        </div>
      ) : null}

      {/* Real-estate details (shown only for daşınmaz-əmlak categories) */}
      {type === "GENERAL" && isRealEstateSelected ? (
        <div className="rounded-2xl border p-4 bg-white">
          <div className="font-semibold mb-3">Daşınmaz əmlak məlumatları</div>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm">
              Əmlak növü
              <select defaultValue={(initial as any)?.realEstate?.propertyType ?? ""} name="propertyType" className="ui-input mt-1">
                <option value="">Seç…</option>
                <option value="Mənzil">Mənzil</option>
                <option value="Ev">Ev</option>
                <option value="Həyət evi">Həyət evi</option>
                <option value="Torpaq">Torpaq</option>
                <option value="Ofis">Ofis</option>
              </select>
            </label>
            <label className="text-sm">
              Otaq sayı
              <select defaultValue={(initial as any)?.realEstate?.rooms ?? ""} name="rooms" className="ui-input mt-1">
                <option value="">Seç…</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Sahə (m²)
              <input defaultValue={(initial as any)?.realEstate?.areaM2 ?? ""} name="areaM2" type="number" min={0} className="ui-input mt-1" />
            </label>

            <label className="text-sm">
              Mərtəbə
              <input defaultValue={(initial as any)?.realEstate?.floor ?? ""} name="floor" type="number" min={0} className="ui-input mt-1" placeholder="məs: 5" />
            </label>
            <label className="text-sm">
              Ümumi mərtəbə
              <input defaultValue={(initial as any)?.realEstate?.totalFloors ?? ""} name="totalFloors" type="number" min={0} className="ui-input mt-1" placeholder="məs: 9" />
            </label>
          </div>
        </div>
      ) : null}

      <label className="text-sm">
        Təsvir
        <textarea defaultValue={initial?.description ?? ""} name="description" required minLength={10} className="ui-input mt-1 min-h-[120px]" />
      </label>

      {existingImages.length ? (
        <div className="rounded-2xl border p-4 bg-white">
          <div className="font-semibold mb-3">Mövcud şəkillər</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {existingImages.map((src) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden border">
                <Image src={src} alt="Şəkil" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImages((prev) => prev.filter((x) => x !== src))}
                  className="absolute right-1 top-1 rounded-lg bg-white/90 border px-2 py-1 text-xs hover:bg-white"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-500 mt-2">Düzəliş zamanı istədiyin şəkli silə, yenilərini əlavə edə bilərsən.</div>
        </div>
      ) : null}

      <label className="text-sm">
        Şəkillər (JPG/PNG/WEBP, max 12)
        <input name="files" type="file" accept="image/*" multiple className="mt-1 w-full" />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm flex items-center gap-2">
          <input defaultChecked={Boolean(initial?.flags?.urgent)} name="urgent" type="checkbox" className="rounded" /> Təcili
        </label>
      </div>

      {status !== "idle" ? (
        <div className={"text-sm " + (status === "err" ? "text-red-600" : "text-zinc-700")}>{msg}</div>
      ) : null}

      <button
        disabled={status === "loading"}
        className="ui-btn-primary py-2"
      >
        {initial ? "Dəyişiklikləri göndər" : "Elanı göndər"}
      </button>
    </form>
  );
}
