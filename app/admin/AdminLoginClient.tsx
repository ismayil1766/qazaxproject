"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Step = "CREDS" | "EMAIL_OTP" | "SETUP_TOTP" | "SETUP_LOCKED" | "TOTP" | "RECOVERY_CODES" | "DONE";

function cls(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function AdminLoginClient({ defaultUsername }: { defaultUsername: string }) {
  const [step, setStep] = useState<Step>("CREDS");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [totp, setTotp] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function post(url: string, body: any) {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || "Xəta baş verdi.");
      return j;
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    try {
      const j = await post("/api/admin/auth/start", { username, password });
      setStep(j.step === "EMAIL_OTP" ? "EMAIL_OTP" : "EMAIL_OTP");
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    }
  }

  async function verifyEmail() {
    try {
      const j = await post("/api/admin/auth/verify-email", { code: emailOtp });
      if (j.step === "TOTP") setStep("TOTP");
      else if (j.step === "SETUP_TOTP") {
        setQrDataUrl(j.qrDataUrl || "");
        setStep("SETUP_TOTP");
      } else if (j.step === "SETUP_LOCKED") {
        setStep("SETUP_LOCKED");
      } else {
        setErr("Gözlənilməz cavab.");
      }
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    }
  }

  async function confirmTotp() {
    try {
      const j = await post("/api/admin/auth/confirm-totp", { code: totp });
      setRecoveryCodes(j.recoveryCodes || []);
      setStep("RECOVERY_CODES");
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    }
  }

  async function verifyTotpOrRecovery() {
    try {
      await post("/api/admin/auth/verify-totp", { code: totp });
      // Refresh to load admin page with cookie
      window.location.href = "/admin";
    } catch (e: any) {
      setErr(e?.message || "Xəta");
    }
  }

  const title = useMemo(() => {
    if (step === "CREDS") return "Admin giriş";
    if (step === "EMAIL_OTP") return "Email OTP";
    if (step === "SETUP_TOTP") return "Google Authenticator qur";
    if (step === "SETUP_LOCKED") return "Authenticator artıq göstərilib";
    if (step === "TOTP") return "Authenticator / Recovery kod";
    if (step === "RECOVERY_CODES") return "Recovery kodlar";
    return "Admin giriş";
  }, [step]);

  return (
    <div className="rounded-3xl border bg-white p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <p className="mt-2 text-zinc-600">
        Təhlükəsizlik: Parol + Email OTP + Google Authenticator + Recovery kodlar.
      </p>

      {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

      {step === "CREDS" ? (
        <div className="mt-4 grid gap-3 max-w-sm">
          <label className="text-sm">
            Login
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Parol
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <button
            disabled={loading}
            onClick={start}
            className={cls("ui-btn-primary px-4 py-2", loading ? "opacity-60" : "")}
          >
            {loading ? "Gözləyin..." : "Daxil ol"}
          </button>
        </div>
      ) : null}

      {step === "EMAIL_OTP" ? (
        <div className="mt-4 grid gap-3 max-w-sm">
          <div className="text-sm text-zinc-700">
            Emailinizə 6 rəqəmli OTP göndərildi.
          </div>
          <label className="text-sm">
            OTP kod
            <input
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              className="mt-1 w-full rounded-xl border px-3 py-2 tracking-widest"
            />
          </label>
          <button
            disabled={loading}
            onClick={verifyEmail}
            className={cls("ui-btn-primary px-4 py-2", loading ? "opacity-60" : "")}
          >
            {loading ? "Yoxlanır..." : "Təsdiqlə"}
          </button>
        </div>
      ) : null}

      {step === "SETUP_TOTP" ? (
        <div className="mt-4 grid gap-4">
          <div className="text-sm text-zinc-700">
            QR kod yalnız <b>1 dəfə</b> göstərilir. Telefonla scan edin, sonra aşağıdakı 6 rəqəmli kodu yazıb aktiv edin.
          </div>

          {qrDataUrl ? (
            <Image alt="QR" src={qrDataUrl} className="w-[220px] h-[220px] border rounded-2xl"  width={220} height={220} />
          ) : null}

          <label className="text-sm max-w-sm">
            Authenticator kodu
            <input
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              className="mt-1 w-full rounded-xl border px-3 py-2 tracking-widest"
            />
          </label>

          <button
            disabled={loading}
            onClick={confirmTotp}
            className={cls("max-w-sm ui-btn-primary px-4 py-2", loading ? "opacity-60" : "")}
          >
            {loading ? "Aktivləşir..." : "Aktiv et"}
          </button>
        </div>
      ) : null}

      {step === "SETUP_LOCKED" ? (
        <div className="mt-4 text-sm text-zinc-700">
          QR kod artıq bir dəfə göstərilib və təkrar göstərilmir. Əgər scan etməmisinizsə, bu, təhlükəsizlik üçün belədir.
          MFA reset üçün recovery kod (əgər varsa) və ya serverdə manual sıfırlama lazımdır.
        </div>
      ) : null}

      {step === "TOTP" ? (
        <div className="mt-4 grid gap-3 max-w-sm">
          <div className="text-sm text-zinc-700">
            Google Authenticator kodunu (6 rəqəm) və ya recovery kodunu (xxxx-xxxx-xxxx) yazın.
          </div>
          <label className="text-sm">
            Kod
            <input
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="123456 və ya abcd-efgh-ijkl"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <button
            disabled={loading}
            onClick={verifyTotpOrRecovery}
            className={cls("ui-btn-primary px-4 py-2", loading ? "opacity-60" : "")}
          >
            {loading ? "Daxil olunur..." : "Daxil ol"}
          </button>
        </div>
      ) : null}

      {step === "RECOVERY_CODES" ? (
        <div className="mt-4 grid gap-3">
          <div className="text-sm text-zinc-700">
            Aşağıdakı recovery kodları <b>bir dəfə</b> görəcəksiniz. Kopyalayın və təhlükəsiz yerdə saxlayın.
          </div>
          <div className="rounded-2xl border bg-zinc-50 p-4 font-mono text-sm grid gap-1">
            {recoveryCodes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          <button
            onClick={() => {
              const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "admin-recovery-codes.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="max-w-sm ui-btn-outline px-4 py-2"
          >
            TXT kimi yüklə
          </button>

          <button
            className="max-w-sm ui-btn-primary px-4 py-2"
            onClick={() => (window.location.href = "/admin")}
          >
            Admin panelə keç
          </button>
        </div>
      ) : null}
    </div>
  );
}