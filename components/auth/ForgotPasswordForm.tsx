"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submitRequest() {
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Xəta");
      setStatus("done");
      setMsg(data?.message || "Sorğu admin panelinə göndərildi.");
      setPhone("");
      setNote("");
    } catch (e: any) {
      setStatus("err");
      setMsg(e?.message || "Xəta");
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-5">
      <div className="text-lg font-semibold">Şifrə bərpa sorğusu göndər</div>
      <p className="mt-2 text-sm text-zinc-600">
        Telefon nömrənizi yazın. Sorğu admin panelinə düşəcək, admin yeni şifrə təyin edib sizinlə WhatsApp və ya zənglə əlaqə saxlayacaq.
      </p>

      <label className="mt-4 block text-sm">
        Telefon nömrəsi
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="050 123 45 67"
        />
      </label>

      <label className="mt-3 block text-sm">
        Qeyd (istəyə bağlı)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          placeholder="Məs: hesab mənim adıma açılıb, zəng edin"
        />
      </label>

      {msg ? <div className={`mt-3 text-sm ${status === "err" ? "text-red-600" : "text-emerald-700"}`}>{msg}</div> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submitRequest}
          disabled={status === "loading" || !phone.trim()}
          className="ui-btn-primary px-4 py-2"
        >
          Sorğu göndər
        </button>
        <Link href="/daxil-ol" className="ui-btn-outline px-4 py-2">
          Daxil ol səhifəsinə qayıt
        </Link>
      </div>
    </div>
  );
}
