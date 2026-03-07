"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type N = {
  id: string;
  title: string;
  body?: string | null;
  href?: string | null;
  kind: string;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationsClient() {
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const unreadCount = useMemo(() => items.filter((x) => !x.readAt).length, [items]);

  function fmt(ts: string) {
    try {
      return new Date(ts).toLocaleString("az-AZ");
    } catch {
      return ts;
    }
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/notifications?take=80");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Giriş tələb olunur");
      setItems(d.items || []);
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, readAt: x.readAt || new Date().toISOString() } : x)));
  }

  async function remove(id: string) {
    if (!confirm("Bildirişi silmək istəyirsən?")) return;
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) return <div className="rounded-3xl border bg-white p-6 text-sm text-zinc-600">Yüklənir…</div>;

  if (err) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm text-red-600">{err}</div>
        <div className="mt-3">
          <Link className="underline" href="/daxil-ol?next=%2Fbildirisler">Daxil ol</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="font-medium">Siyahı ({items.length})</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">Oxunmamış: {unreadCount}</span>
          <button onClick={markAllRead} className="ui-btn-outline-violet px-3 py-2 text-sm">Hamısını oxunmuş et</button>
        </div>
      </div>

      <div className="divide-y">
        {items.map((n) => (
          <div key={n.id} className="p-4 flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`font-medium ${n.readAt ? "text-zinc-700" : "text-zinc-950"}`}>{n.title}</div>
                {n.body ? <div className="text-sm text-zinc-600 mt-1">{n.body}</div> : null}
                <div className="text-xs text-zinc-500 mt-2">{fmt(n.createdAt)} • {n.kind}</div>
                {n.href ? (
                  <Link
                    href={n.href}
                    className="inline-block mt-2 text-sm underline"
                    onClick={() => markRead(n.id)}
                  >
                    Aç
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!n.readAt ? (
                  <button onClick={() => markRead(n.id)} className="ui-btn-outline px-3 py-2 text-sm">Oxunmuş</button>
                ) : null}
                <button onClick={() => remove(n.id)} className="ui-btn-danger-outline px-3 py-2 text-sm">Sil</button>
              </div>
            </div>
          </div>
        ))}
        {!items.length ? <div className="p-4 text-sm text-zinc-600">Bildiriş yoxdur.</div> : null}
      </div>

      <div className="p-4 border-t text-xs text-zinc-500">
        Qeyd: Bildirişlər mail ilə göndərilmir — hamısı sayt daxilində saxlanılır.
      </div>
    </div>
  );
}
