import Image from "next/image";
import Link from "next/link";
import { getListingById } from "@/lib/data";
import { Badge } from "@/components/Badge";
import { cookies } from "next/headers";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cookieHeaderFromNextCookies() {
  const all = cookies().getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const l = await getListingById(params.id);

  // Owner-only actions (VIP/Premium should NOT be accessible for other users)
  const cookieHeader = cookieHeaderFromNextCookies();
  const u = await getUserFromRequest(new Request("http://local/elan", { headers: { cookie: cookieHeader } }));
  const isOwner = Boolean(u?.id && l?.userId && u.id === l.userId);
  const canView = Boolean(l && (l.status === "ACTIVE" || isOwner || u?.role === "ADMIN"));

  if (!l || !canView) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Elan tapılmadı</h1>
        <p className="mt-2 text-zinc-600">Bu elan silinmiş və ya mövcud deyil.</p>
        <Link href="/" className="mt-4 inline-block underline">Ana səhifə</Link>
      </div>
    );
  }

  const images = Array.isArray(l.images) ? l.images : [];
  const flags = (l.flags ?? {}) as any;
  const vipActive = Boolean(flags.vip) && l.vipUntil && new Date(l.vipUntil).getTime() > Date.now();
  const premiumActive = Boolean(flags.premium) && l.premiumUntil && new Date(l.premiumUntil).getTime() > Date.now();
  const shortId = l.id ? String(l.id).slice(-6).toUpperCase() : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          {vipActive ? <Badge variant="vip">VIP</Badge> : null}
          {premiumActive ? <Badge variant="premium">Premium</Badge> : null}
          {flags.urgent ? <Badge variant="urgent">Təcili</Badge> : null}
          <Badge>{l.type === "VEHICLE" ? "Avtomobil" : "Elan"}</Badge>
          <span className="text-sm text-zinc-600">{l.city}{l.district ? `, ${l.district}` : ""}</span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold">{l.title}</h1>
        <div className="mt-1 text-xs text-zinc-500">Elan ID: {shortId} <span className="text-zinc-400">({l.id})</span></div>

        <div className="mt-2 text-lg font-semibold">
          {l.price ? `${l.price} ${l.currency}` : "Qiymət: razılaşma"}
        </div>

        {images.length ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {images.slice(0, 9).map((src: string, idx: number) => (
              <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border">
                <Image src={src} alt={`${l.title} şəkil ${idx+1}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-600">Şəkil yoxdur.</div>
        )}

        {l.vehicle ? (
          <div className="mt-6 rounded-2xl border bg-zinc-50 p-4">
            <h2 className="font-semibold">Avtomobil məlumatları</h2>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div><span className="text-zinc-600">Marka:</span> {l.vehicle.make}</div>
              <div><span className="text-zinc-600">Model:</span> {l.vehicle.model}</div>
              <div><span className="text-zinc-600">İl:</span> {l.vehicle.year}</div>
              {l.vehicle.mileageKm ? <div><span className="text-zinc-600">Yürüş:</span> {l.vehicle.mileageKm} km</div> : null}
              {l.vehicle.fuel ? <div><span className="text-zinc-600">Yanacaq:</span> {l.vehicle.fuel}</div> : null}
              {l.vehicle.transmission ? <div><span className="text-zinc-600">Sürətlər qutusu:</span> {l.vehicle.transmission}</div> : null}
              {l.vehicle.bodyType ? <div><span className="text-zinc-600">Ban:</span> {l.vehicle.bodyType}</div> : null}
              {l.vehicle.color ? <div><span className="text-zinc-600">Rəng:</span> {l.vehicle.color}</div> : null}
              <div><span className="text-zinc-600">Kredit:</span> {l.vehicle.credit ? "Bəli" : "Xeyr"}</div>
              <div><span className="text-zinc-600">Barter:</span> {l.vehicle.barter ? "Bəli" : "Xeyr"}</div>
            </div>
          </div>
        ) : null}


		{l.phoneDetails ? (
          <div className="mt-6 rounded-2xl border bg-zinc-50 p-4">
            <h2 className="font-semibold">Telefon məlumatları</h2>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
			  <div><span className="text-zinc-600">Marka:</span> {l.phoneDetails.brand}</div>
			  <div><span className="text-zinc-600">Model:</span> {l.phoneDetails.model}</div>
			  {l.phoneDetails.storageGb ? <div><span className="text-zinc-600">Yaddaş:</span> {l.phoneDetails.storageGb} GB</div> : null}
			  {l.phoneDetails.condition ? <div><span className="text-zinc-600">Vəziyyət:</span> {l.phoneDetails.condition}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 whitespace-pre-wrap text-zinc-800">{l.description}</div>

        <div className="mt-6 rounded-2xl border p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <div className="font-semibold">{l.contactName}</div>
            <div className="text-sm text-zinc-600">{l.phone}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:flex-wrap md:justify-end">
            <a href={`tel:${l.phone}`} className="ui-btn-outline px-4 py-2 text-center">Zəng et</a>
            {l.whatsapp ? (
              <a
                href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                className="ui-btn-primary px-4 py-2 text-center"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
            {isOwner ? (
              <Link href="/profil?tab=elanlarim" className="ui-btn-outline-violet px-4 py-2 text-center">
                Admin yoxlaması üçün profilə keç
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
