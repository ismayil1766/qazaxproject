"use client";

import { useState } from "react";

export function ProfileSecurity() {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "err" | "ok">("idle");
  const [msg, setMsg] = useState("");

  async function submit() {
    if (pw !== pw2) {
      setStatus("err");
      setMsg("Yeni şifrələr uyğun deyil");
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Xəta");
      setStatus("ok");
      setMsg("Şifrə dəyişdirildi");
      setCurrent("");
      setPw("");
      setPw2("");
    } catch (e: any) {
      setStatus("err");
      setMsg(e?.message || "Xəta");
    }
  }

  async function logoutAll() {
    if (!confirm("Bütün cihazlardan çıxış edilsin?")) return;
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Xəta");
      window.location.href = "/daxil-ol?next=%2Fprofil";
    } catch (e: any) {
      alert(e?.message || "Xəta");
    }
  }

  return (
    <div id="tehlukesizlik" className="rounded-3xl border bg-white p-6 scroll-mt-24">
      <h2 className="text-lg font-semibold">Təhlükəsizlik</h2>
      <p className="mt-1 text-sm text-zinc-600">Şifrəni dəyişmək üçün əvvəl cari şifrəni yazın, sonra yenisini.</p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          Cari şifrə
          <input
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            type="password"
            className="mt-1 ui-input"
          />
        </label>
        <label className="text-sm">
          Yeni şifrə
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            className="mt-1 ui-input"
            placeholder="Min 8 simvol, böyük+kiçik+rəhbəm"
          />
        </label>
        <label className="text-sm">
          Yeni şifrə (təkrar)
          <input
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            type="password"
            className="mt-1 ui-input"
          />
        </label>
      </div>

      {status === "err" ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}
      {status === "ok" ? <div className="mt-2 text-sm text-green-700">{msg}</div> : null}

      <button
        onClick={submit}
        disabled={status === "loading" || !current || !pw}
        className="mt-4 ui-btn-primary py-2 px-4"
      >
        Şifrəni dəyiş
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={logoutAll}
          className="ui-btn-outline px-4 py-2 text-sm"
        >
          Bütün cihazlardan çıxış
        </button>
        <span className="text-xs text-zinc-500">Şifrə dəyişəndə sessiyalar avtomatik sıfırlanır.</span>
      </div>
    </div>
  );
}
