"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ProfileAccount } from "@/components/ProfileAccount";
import { ProfileListings } from "@/components/ProfileListings";
import { ProfileSecurity } from "@/components/ProfileSecurity";

type View = "profil" | "elanlarim" | "tehlukesizlik";

function normalizeHash(hash: string) {
  return hash.replace("#", "").trim().toLowerCase();
}

function getViewFromHash(hash: string): View {
  const h = normalizeHash(hash);
  if (!h || h === "profil") return "profil";
  if (h === "elanlarim" || h === "elanlarım") return "elanlarim";
  if (h === "tehlukesizlik" || h === "tehlukəsizlik") return "tehlukesizlik";
  return "profil";
}

function getViewFromTabParam(tab: string | null): View {
  if (!tab) return "profil";
  const t = tab.trim().toLowerCase();
  if (t === "profil") return "profil";
  if (t === "elanlarim" || t === "elanlarım") return "elanlarim";
  if (t === "tehlukesizlik" || t === "tehlukəsizlik" || t === "tehluk" || t === "security") {
    return "tehlukesizlik";
  }
  return "profil";
}

export function ProfilePageClient() {
  const [view, setView] = useState<View>("profil");
  const searchParams = useSearchParams();

  // Prefer query param: /profil?tab=profil|elanlarim|tehlukesizlik
  // Fallback: hash (#elanlarim etc.)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setView(getViewFromTabParam(tab));
      return;
    }
    setView(getViewFromHash(window.location.hash));
  }, [searchParams]);

  const header = useMemo(() => {
    if (view === "elanlarim") {
      return { title: "Elanlarım", desc: "Yerləşdirdiyin elanları buradan idarə et." };
    }
    if (view === "tehlukesizlik") {
      return { title: "Təhlükəsizlik", desc: "Şifrən və hesab təhlükəsizliyi ayarları." };
    }
    return { title: "Profil", desc: "Hesab məlumatlarını buradan yenilə." };
  }, [view]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{header.title}</h1>
            <p className="mt-2 text-zinc-600">{header.desc}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/profil?tab=profil"
            className={
              view === "profil"
                ? "ui-pill ui-pill-active"
                : "ui-pill"
            }
          >
            Profil
          </Link>
          <Link
            href="/profil?tab=elanlarim"
            className={
              view === "elanlarim"
                ? "ui-pill ui-pill-active"
                : "ui-pill"
            }
          >
            Elanlarım
          </Link>

          <Link href="/secilmisler" className="ui-pill">
            Seçilmişlər
          </Link>

          <Link href="/bildirisler" className="ui-pill">
            Bildirişlər
          </Link>

          <Link
            href="/profil?tab=tehlukesizlik"
            className={
              view === "tehlukesizlik"
                ? "ui-pill ui-pill-active"
                : "ui-pill"
            }
          >
            Təhlükəsizlik
          </Link>
        </div>
      </div>

      {view === "profil" ? <ProfileAccount /> : null}
      {view === "elanlarim" ? <ProfileListings /> : null}
      {view === "tehlukesizlik" ? <ProfileSecurity /> : null}
    </div>
  );
}
