"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
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
    const identifier = String(fd.get("identifier") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
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
        Telefon nömrəsi
        <input
          name="identifier"
          required
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="050 123 45 67"
        />
      </label>
      <label className="text-sm">
        Şifrə
        <input
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      {status === "err" ? <div className="text-sm text-red-600">{msg}</div> : null}

      <button disabled={status === "loading"} className="mt-2 ui-btn-primary py-2">
        Daxil ol
      </button>

      <div className="text-sm mt-1">
        <Link className="underline text-zinc-700" href="/sifre-berpa">
          Şifrəni unutdum
        </Link>
      </div>

      <div className="text-sm text-zinc-600 mt-2">
        Hesabın yoxdur?{" "}
        <Link className="underline" href={`/qeydiyyat?next=${encodeURIComponent(next)}`}>
          Qeydiyyatdan keç
        </Link>
      </div>
    </form>
  );
}
