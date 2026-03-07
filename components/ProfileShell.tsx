import Link from "next/link";
import type { ReactNode } from "react";

type ActiveTab = "profil" | "elanlarim" | "secilmisler" | "bildirisler" | "tehlukesizlik";

export function ProfileShell({
  active,
  title,
  desc,
  children,
}: {
  active: ActiveTab;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-zinc-600">{desc}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/profil?tab=profil" className={active === "profil" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Profil
          </Link>
          <Link
            href="/profil?tab=elanlarim"
            className={active === "elanlarim" ? "ui-pill ui-pill-active" : "ui-pill"}
          >
            Elanlarım
          </Link>
          <Link href="/secilmisler" className={active === "secilmisler" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Seçilmişlər
          </Link>
          <Link href="/bildirisler" className={active === "bildirisler" ? "ui-pill ui-pill-active" : "ui-pill"}>
            Bildirişlər
          </Link>
          <Link
            href="/profil?tab=tehlukesizlik"
            className={active === "tehlukesizlik" ? "ui-pill ui-pill-active" : "ui-pill"}
          >
            Təhlükəsizlik
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
