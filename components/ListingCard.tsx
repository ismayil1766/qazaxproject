import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/Badge";
import { FavoriteButton } from "@/components/FavoriteButton";

type Listing = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  city: string;
  images: any;
  flags: any;
  type: "VEHICLE" | "GENERAL";
  createdAt: string;
  vipUntil?: string | null;
  premiumUntil?: string | null;
};

export function ListingCard({ l }: { l: Listing }) {
  const img = Array.isArray(l.images) && l.images.length ? l.images[0] : null;
  const flags = (l.flags ?? {}) as any;
  const vipActive = Boolean(flags.vip) && l.vipUntil && new Date(l.vipUntil).getTime() > Date.now();
  const premiumActive = Boolean(flags.premium) && l.premiumUntil && new Date(l.premiumUntil).getTime() > Date.now();
  const shortId = l.id ? String(l.id).slice(-6).toUpperCase() : "";

  return (
    <Link
      href={`/elan/${l.id}`}
      className="group rounded-3xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] bg-zinc-100">
        <FavoriteButton listingId={l.id} />
        {img ? (
          <Image src={img} alt={l.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">Şəkil yoxdur</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1 flex-wrap">
          {vipActive ? <Badge variant="vip">VIP</Badge> : null}
          {premiumActive ? <Badge variant="premium">Premium</Badge> : null}
          {flags.urgent ? <Badge variant="urgent">Təcili</Badge> : null}
          {l.type === "VEHICLE" ? <Badge>Avtomobil</Badge> : <Badge>Elan</Badge>}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="font-medium leading-snug line-clamp-2 group-hover:underline">{l.title}</div>
        <div className="flex items-center justify-between text-sm">
          <div className="font-semibold">{l.price ? `${l.price} ${l.currency}` : "Qiymət: razılaşma"}</div>
          <div className="text-zinc-600">{l.city}</div>
        </div>
        <div className="text-xs text-zinc-500">ID: {shortId}</div>
      </div>
    </Link>
  );
}
