"use client";

import { useEffect, useMemo, useState } from "react";
import { isInternalGeneratedEmail } from "@/lib/loginIdentity";

type Me = {
  id: string;
  email: string;
  name?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

function initials(name?: string | null, lastName?: string | null, fallback?: string) {
  const a = String(name || "").trim();
  const b = String(lastName || "").trim();
  const src = (a || b) ? `${a} ${b}`.trim() : String(fallback || "");
  const parts = src.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function ProfileAccount() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");
  const [okMsg, setOkMsg] = useState<string>("");

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/me")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Giriş tələb olunur");
        return d;
      })
      .then((d) => {
        if (!mounted) return;
        const u: Me = d.user;
        setMe(u);
        setName(String(u?.name || ""));
        setLastName(String(u?.lastName || ""));
        setPhone(String(u?.phone || ""));
        setAvatarUrl(String(u?.avatarUrl || ""));
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

  const avatarPreview = useMemo(() => {
    const url = avatarUrl.trim();
    return url ? url : null;
  }, [avatarUrl]);

  const hasRealEmail = Boolean(me?.email && !isInternalGeneratedEmail(me.email));
  const accountLabel = hasRealEmail ? me?.email || "" : me?.phone || "";
  const accountLabelTitle = hasRealEmail ? "Email" : "Giriş nömrəsi";

  async function uploadAvatar(file: File) {
    setErr("");
    setOkMsg("");
    const fd = new FormData();
    fd.append("files", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.error || "Upload xətası");
    const url = Array.isArray(d.urls) && d.urls[0] ? String(d.urls[0]) : "";
    if (!url) throw new Error("Upload xətası");
    setAvatarUrl(url);
  }

  async function save() {
    setSaving(true);
    setErr("");
    setOkMsg("");
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Xəta");
      setMe(d.user);
      setPhone(String(d?.user?.phone || ""));
      setOkMsg("Yadda saxlanıldı");
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border bg-white p-6 text-sm text-zinc-600">Yüklənir...</div>;

  if (err && !me) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm text-red-600">{err}</div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Hesab məlumatları</h2>
      <p className="mt-1 text-sm text-zinc-600">Ad/soyad, telefon və avatarı buradan yeniləyə bilərsən.</p>

      <div className="mt-4 flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl border bg-zinc-50 overflow-hidden flex items-center justify-center text-sm font-semibold text-zinc-700">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials(me?.name, me?.lastName, me?.phone || me?.email)
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Avatar</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f).catch((x) => setErr(x?.message || "Upload xətası"));
                }}
              />
              <label htmlFor="avatar-file" className="ui-btn-outline-violet px-4 py-2 text-sm cursor-pointer select-none">
                Şəkil seç
              </label>
              <button type="button" className="ui-btn-danger-outline px-4 py-2 text-sm" onClick={() => setAvatarUrl("") }>
                Avatarı sil
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 grid md:grid-cols-3 gap-3">
          <label className="text-sm">
            Ad
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 ui-input" />
          </label>
          <label className="text-sm">
            Soyad
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 ui-input" />
          </label>
          <label className="text-sm">
            Telefon
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 ui-input" placeholder="050 123 45 67" />
          </label>

          <label className="text-sm md:col-span-2">
            {accountLabelTitle}
            <input value={accountLabel} readOnly className="mt-1 ui-input bg-zinc-50 text-zinc-600" />
          </label>

          <div className="flex items-end">
            <button type="button" onClick={save} disabled={saving} className="w-full ui-btn-primary py-2">
              Yadda saxla
            </button>
          </div>

          {err ? <div className="md:col-span-3 text-sm text-red-600">{err}</div> : null}
          {okMsg ? <div className="md:col-span-3 text-sm text-green-700">{okMsg}</div> : null}
        </div>
      </div>
    </div>
  );
}
