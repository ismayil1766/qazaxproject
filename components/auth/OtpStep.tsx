"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function OtpStep({ email, next, purpose, onBack }: { email: string; next: string; purpose: "LOGIN" | "VERIFY_EMAIL"; onBack: () => void; }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = useState<string>("");
  const RESEND_SECONDS = 90;
  const [cooldown, setCooldown] = useState<number>(RESEND_SECONDS);

  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);


  async function verify() {
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Xəta");
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setStatus("err");
      setMsg(e?.message || "Xəta");
    }
  }

  async function resend() {
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Xəta");
      setCooldown(RESEND_SECONDS);
      setStatus("idle");
    } catch (e: any) {
      setStatus("err");
      setMsg(e?.message || "Xəta");
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-5">
      <div className="text-sm text-zinc-600">Kod bu ünvana göndərildi:</div>
      <div className="font-medium">{email}</div>

      <label className="text-sm block mt-4">
        OTP kodu (6 rəqəm)
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          className="mt-1 ui-input tracking-widest text-lg"
          placeholder="000000"
        />
      </label>

      {status === "err" ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={verify}
          disabled={status === "loading" || code.length !== 6}
          className="flex-1 ui-btn-primary py-2"
        >
          Təsdiqlə
        </button>
        <button
          onClick={resend}
          disabled={status === "loading" || cooldown > 0}
          className="ui-btn-outline px-4 py-2 disabled:opacity-60"
        >
          {cooldown > 0 ? `Yenidən göndər (${cooldown}s)` : "Yenidən göndər"}
        </button>
      </div>

      <button onClick={onBack} className="mt-3 text-sm underline text-zinc-700">
        Geri
      </button>

      
    </div>
  );
}
