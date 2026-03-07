"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import { promotionRequestsEnabled } from "@/lib/site";

type Listing = any;
type PromotionKind = "VIP" | "PREMIUM";

const PROMOTION_REQUESTS_ENABLED = promotionRequestsEnabled();

const PROMO_PLANS: Record<PromotionKind, Array<{ days: number; price: number }>> = {
  VIP: [
    { days: 7, price: 5 },
    { days: 15, price: 9 },
    { days: 30, price: 15 },
  ],
  PREMIUM: [
    { days: 7, price: 3 },
    { days: 15, price: 5 },
    { days: 30, price: 9 },
  ],
};

function humanKind(kind: PromotionKind) {
  return kind === "VIP" ? "VIP" : "Premium";
}

function getPendingRequest(listing: any, kind: PromotionKind) {
  const arr = Array.isArray(listing?.promotionRequests) ? listing.promotionRequests : [];
  return arr.find((r: any) => String(r.kind).toUpperCase() === kind && r.status === "PENDING") || null;
}

export function ProfileListings() {
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>([]);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "PENDING" | "REJECTED" | "ARCHIVED">("ALL");
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoListing, setPromoListing] = useState<Listing | null>(null);
  const [promoKind, setPromoKind] = useState<PromotionKind>("VIP");
  const [promoPlanDays, setPromoPlanDays] = useState<number>(PROMO_PLANS.VIP[0].days);
  const [promoNote, setPromoNote] = useState("");
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");
    fetch(`/api/listings/mine?status=${encodeURIComponent(status)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Giriş tələb olunur");
        return d;
      })
      .then((d) => {
        if (!mounted) return;
        setItems(d.items || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || "Xəta");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => String(x.title || "").toLowerCase().includes(s));
  }, [items, q]);

  async function onDelete(id: string) {
    if (!confirm("Elanı silmək istəyirsən?")) return;
    const res = await fetch(`/api/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return alert(d?.error || "Xəta");
    setItems((prev) => prev.filter((x) => x.id !== id));
    router.refresh();
  }

  async function toggleArchive(id: string, next: "ARCHIVED" | "ACTIVE") {
    const res = await fetch(`/api/listings/${encodeURIComponent(id)}/${next === "ARCHIVED" ? "archive" : "unarchive"}`, {
      method: "POST",
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return alert(d?.error || "Xəta");
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: next } : x)));
    router.refresh();
  }

  function openPromotion(listing: Listing, kind: PromotionKind) {
    if (!PROMOTION_REQUESTS_ENABLED) {
      setBanner({ type: "error", text: "VIP və Premium müraciətləri hazırda deaktivdir." });
      return;
    }
    setPromoListing(listing);
    setPromoKind(kind);
    setPromoPlanDays(PROMO_PLANS[kind][0].days);
    setPromoNote("");
    setPromoOpen(true);
  }

  async function submitPromotionRequest() {
    if (!promoListing) return;
    if (!PROMOTION_REQUESTS_ENABLED) {
      setBanner({ type: "error", text: "VIP və Premium müraciətləri hazırda deaktivdir." });
      setPromoOpen(false);
      return;
    }
    setPromoSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(promoListing.id)}/promotion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: promoKind,
          planDays: promoPlanDays,
          note: promoNote,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Sorğu göndərilmədi");

      setItems((prev) =>
        prev.map((x) =>
          x.id === promoListing.id
            ? {
                ...x,
                promotionRequests: [d.request, ...(Array.isArray(x.promotionRequests) ? x.promotionRequests : [])],
              }
            : x
        )
      );
      setBanner({ type: "ok", text: d?.message || "Sorğu göndərildi." });
      setPromoOpen(false);
      setPromoListing(null);
      setPromoNote("");
      router.refresh();
    } catch (e: any) {
      setBanner({ type: "error", text: e?.message || "Xəta baş verdi" });
    } finally {
      setPromoSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border bg-white p-6 text-sm text-zinc-600">Yüklənir…</div>;
  }

  if (err) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-red-600 text-sm">{err}</div>
        <div className="mt-3">
          <Link className="underline" href="/daxil-ol?next=%2Fprofil">
            Daxil ol
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white overflow-hidden">
      <div className="p-4 border-b flex flex-col gap-3">
        {!PROMOTION_REQUESTS_ENABLED ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            VIP və Premium müraciətləri hazırda deaktivdir. Gələcəkdə env ilə yenidən aktiv edilə bilər.
          </div>
        ) : null}

        {banner ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${banner.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "ACTIVE", "PENDING", "REJECTED", "ARCHIVED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-xl text-sm border ${status === s ? "bg-violet-700 text-white border-violet-700" : "hover:bg-zinc-50"}`}
              >
                {s === "ALL"
                  ? "Hamısı"
                  : s === "ACTIVE"
                  ? "Aktiv"
                  : s === "PENDING"
                  ? "Yoxlamada"
                  : s === "REJECTED"
                  ? "Rədd"
                  : "Arxiv"}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Başlığa görə axtar…"
            className="w-full md:w-72 rounded-xl border px-3 py-2 text-sm"
          />
        </div>

      </div>

      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const vipPending = getPendingRequest(l, "VIP");
          const premiumPending = getPendingRequest(l, "PREMIUM");
          const vipUntilText = l.vipUntil ? new Date(l.vipUntil).toLocaleDateString("az-AZ") : null;
          const premiumUntilText = l.premiumUntil ? new Date(l.premiumUntil).toLocaleDateString("az-AZ") : null;

          return (
            <div key={l.id} className="flex flex-col gap-2">
              <ListingCard l={l} />
              <div className="rounded-2xl border bg-zinc-50 px-3 py-3 text-xs text-zinc-700 flex flex-col gap-2">
                {l.flags?.vip ? <div>VIP aktivdir{vipUntilText ? ` • ${vipUntilText}-dək` : ""}</div> : null}
                {l.flags?.premium ? <div>Premium aktivdir{premiumUntilText ? ` • ${premiumUntilText}-dək` : ""}</div> : null}
                {vipPending ? <div>VIP sorğusu gözləyir • {vipPending.planDays} gün • {vipPending.price ?? 0} {vipPending.currency || "AZN"}</div> : null}
                {premiumPending ? <div>Premium sorğusu gözləyir • {premiumPending.planDays} gün • {premiumPending.price ?? 0} {premiumPending.currency || "AZN"}</div> : null}
                {!l.flags?.vip && !l.flags?.premium && !vipPending && !premiumPending ? <div>Hazırda aktiv boost yoxdur.</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {PROMOTION_REQUESTS_ENABLED && (l.status === "ACTIVE" || l.status === "PENDING") ? (
                  <>
                    <button
                      onClick={() => openPromotion(l, "VIP")}
                      disabled={Boolean(vipPending)}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {vipPending ? "VIP sorğusu göndərilib" : l.flags?.vip ? "VIP uzat" : "VIP üçün müraciət et"}
                    </button>
                    <button
                      onClick={() => openPromotion(l, "PREMIUM")}
                      disabled={Boolean(premiumPending)}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {premiumPending ? "Premium sorğusu göndərilib" : l.flags?.premium ? "Premium uzat" : "Premium üçün müraciət et"}
                    </button>
                  </>
                ) : null}

                {l.status === "PENDING" || l.status === "REJECTED" || l.status === "ACTIVE" ? (
                  <Link
                    href={`/elan-duzelt/${l.id}`}
                    className="flex-1 text-center rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Düzəliş et
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex-1 text-center rounded-xl border px-3 py-2 text-sm opacity-60"
                    title="Düzəliş etdikdə elan yenidən moderasiyaya düşür. Aktiv elanlar üçün arxivdən istifadə et."
                  >
                    Düzəliş et
                  </button>
                )}

                {l.status === "REJECTED" && l.rejectReason ? (
                  <button
                    onClick={() => {
                      setReason(String(l.rejectReason || ""));
                      setReasonOpen(true);
                    }}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Səbəb
                  </button>
                ) : null}

                {l.status === "ACTIVE" ? (
                  <button
                    onClick={() => toggleArchive(l.id, "ARCHIVED")}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Arxivlə
                  </button>
                ) : l.status === "ARCHIVED" ? (
                  <button
                    onClick={() => toggleArchive(l.id, "ACTIVE")}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Aktiv et
                  </button>
                ) : null}
                <button
                  onClick={() => onDelete(l.id)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  Sil
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length ? <div className="text-sm text-zinc-600">Elan tapılmadı.</div> : null}
      </div>

      {reasonOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setReasonOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold">Rədd səbəbi</div>
            <div className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{reason || "—"}</div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
                onClick={() => setReasonOpen(false)}
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {PROMOTION_REQUESTS_ENABLED && promoOpen && promoListing ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPromoOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl border bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold">{humanKind(promoKind)} üçün müraciət</div>
            <div className="mt-1 text-sm text-zinc-600 line-clamp-2">{promoListing.title}</div>

            <div className="mt-4 grid gap-2">
              <div className="text-sm font-medium">Paket seç</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PROMO_PLANS[promoKind].map((plan) => (
                  <button
                    key={plan.days}
                    type="button"
                    onClick={() => setPromoPlanDays(plan.days)}
                    className={`rounded-2xl border px-4 py-3 text-left ${promoPlanDays === plan.days ? "border-violet-700 bg-violet-50" : "hover:bg-zinc-50"}`}
                  >
                    <div className="font-medium">{plan.days} gün</div>
                    <div className="text-sm text-zinc-600">{plan.price} AZN</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-sm">
              Qeyd (opsional)
              <textarea
                value={promoNote}
                onChange={(e) => setPromoNote(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Məs: ödənişi etdikdən sonra bu nömrəyə yazın..."
                className="mt-1 w-full rounded-2xl border px-3 py-2"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-dashed bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Müraciət göndərildikdən sonra aktivləşdirmə avtomatik olmur. Admin ödənişi yoxlayıb VIP/Premium statusunu əl ilə təsdiqləyir.
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setPromoOpen(false)}>
                Bağla
              </button>
              <button
                className="ui-btn-primary px-4 py-2 disabled:opacity-60"
                onClick={submitPromotionRequest}
                disabled={promoSubmitting}
              >
                {promoSubmitting ? "Göndərilir..." : "Müraciəti göndər"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
