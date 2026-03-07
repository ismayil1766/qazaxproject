"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

let cache: { ids: Set<string> | null; loaded: boolean } = { ids: null, loaded: false };
let inflight: Promise<void> | null = null;

async function ensureLoaded() {
  if (cache.loaded) return;
  if (!inflight) {
    inflight = fetch("/api/favorites/ids")
      .then((r) => r.json())
      .then((d) => {
        cache.ids = new Set(Array.isArray(d.ids) ? d.ids.map(String) : []);
        cache.loaded = true;
      })
      .catch(() => {
        cache.ids = new Set();
        cache.loaded = true;
      })
      .finally(() => {
        inflight = null;
      });
  }
  await inflight;
}

export function FavoriteButton({ listingId }: { listingId: string }) {
  const [ready, setReady] = useState(false);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureLoaded().then(() => {
      if (!mounted) return;
      setReady(true);
      setFav(Boolean(cache.ids?.has(listingId)));
    });
    return () => {
      mounted = false;
    };
  }, [listingId]);

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/daxil-ol?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error(d?.error || "Xəta");
      const next = Boolean(d.favorited);
      setFav(next);
      if (!cache.ids) cache.ids = new Set();
      if (next) cache.ids.add(listingId);
      else cache.ids.delete(listingId);
    } catch {
      // ignore
    }
  }

  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fav ? "Seçilmişdən çıxart" : "Seçilmişə əlavə et"}
      className={`absolute right-2 top-2 z-10 rounded-xl border bg-white/90 backdrop-blur px-2 py-2 hover:bg-white transition ${fav ? "text-rose-600" : "text-zinc-700"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-4.35-9.33-8.28C.86 9.5 2.48 6.5 5.5 6.5c1.74 0 3.41.81 4.5 2.09C11.09 7.31 12.76 6.5 14.5 6.5c3.02 0 4.64 3 2.83 6.22C19 16.65 12 21 12 21z" />
      </svg>
    </button>
  );
}
