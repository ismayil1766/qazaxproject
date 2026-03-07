"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";

export function FavoritesClient() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/favorites")
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
  }, []);

  if (loading) return <div className="rounded-3xl border bg-white p-6 text-sm text-zinc-600">Yüklənir…</div>;

  if (err) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm text-red-600">{err}</div>
        <div className="mt-3">
          <Link className="underline" href="/daxil-ol?next=%2Fsecilmisler">Daxil ol</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white overflow-hidden">
      <div className="p-4 border-b font-medium">Elanlar ({items.length})</div>
      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => (
          <ListingCard key={l.id} l={l} />
        ))}
        {!items.length ? <div className="text-sm text-zinc-600">Hələ seçilmiş elan yoxdur.</div> : null}
      </div>
    </div>
  );
}
