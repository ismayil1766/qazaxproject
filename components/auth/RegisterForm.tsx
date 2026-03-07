"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/profil";

  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || "").trim() || undefined,
      phone: String(fd.get("phone") || "").trim(),
      password: String(fd.get("password") || ""),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Xəta");

      router.refresh();
      router.push(next);
    } catch (err: any) {
      setStatus("err");
      setMsg(err?.message || "Xəta");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm">
        Ad
        <input name="name" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ad Soyad" />
      </label>
      <label className="text-sm">
        Telefon
        <input
          name="phone"
          required
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="050 123 45 67"
        />
      </label>
      <label className="text-sm">
        Şifrə (min 8, hərf və rəqəm)
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        Telefon nömrəniz giriş üçün istifadə olunacaq. OTP kodu tələb olunmur.
      </div>

      {status === "err" ? <div className="text-sm text-red-600">{msg}</div> : null}

      <button disabled={status === "loading"} className="mt-2 ui-btn-primary py-2">
        Hesab yarat
      </button>

      <div className="text-sm text-zinc-600 mt-2">
        Artıq hesabın var?{" "}
        <Link className="underline" href={`/daxil-ol?next=${encodeURIComponent(next)}`}>
          Daxil ol
        </Link>
      </div>
    </form>
  );
}
