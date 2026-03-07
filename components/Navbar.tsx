"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationsBell } from "@/components/NotificationsBell";
import { loginDisplayLabel } from "@/lib/loginIdentity";

type User = { id: string; email: string; phone?: string | null; name?: string | null } | null;

export function Navbar() {
  const [user, setUser] = useState<User>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setUser(d.user);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  const nextParam = encodeURIComponent(pathname || "/");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-base sm:text-lg leading-tight">
          <Image src="/logo.jpeg" alt="Qazax və Ağstafa Alqı-Satqı" width={36} height={36} className="rounded-lg" unoptimized />
          <span className="hidden sm:inline">Qazax • Ağstafa Alqı-Satqı</span>
          <span className="sm:hidden flex flex-col leading-tight">
            <span>Qazax/Ağstafa</span>
            <span className="text-xs font-normal text-zinc-500 -mt-0.5">Alqı-Satqı</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/elanlar?tab=vehicle" className="hidden sm:inline-flex px-3 py-2 rounded-lg hover:bg-zinc-200">
            Avtomobillər
          </Link>
          <Link href="/elanlar?tab=general" className="hidden sm:inline-flex px-3 py-2 rounded-lg hover:bg-zinc-200">
            Elanlar
          </Link>

          <Link href={user ? "/yeni" : `/daxil-ol?next=${encodeURIComponent("/yeni")}`} className="ui-btn-primary px-3 py-2">
            Elan yerləşdir
          </Link>

          <div className="hidden sm:block w-px h-6 bg-zinc-200 mx-1" />

          {!loaded ? (
            <span className="text-zinc-500 px-2">...</span>
          ) : user ? (
            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1">
                <NotificationsBell />
                <Link href="/secilmisler" className="px-3 py-2 rounded-lg hover:bg-zinc-200" aria-label="Seçilmişlər">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-4.35-9.33-8.28C.86 9.5 2.48 6.5 5.5 6.5c1.74 0 3.41.81 4.5 2.09C11.09 7.31 12.76 6.5 14.5 6.5c3.02 0 4.64 3 2.83 6.22C19 16.65 12 21 12 21z" />
                  </svg>
                </Link>
              </div>

              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-200 flex items-center gap-2"
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <span className="text-zinc-700 hidden sm:inline">{loginDisplayLabel(user)}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className={open ? "rotate-180 transition-transform" : "transition-transform"}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {open ? (
                  <div role="menu" className="absolute right-0 mt-2 w-52 rounded-2xl border bg-white shadow-lg p-1 z-50">
                    <Link href="/profil?tab=profil" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Profil
                    </Link>
                    <Link href="/profil?tab=elanlarim" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Elanlarım
                    </Link>
                    <Link href="/bildirisler" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Bildirişlər
                    </Link>
                    <Link href="/secilmisler" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Seçilmişlər
                    </Link>
                    <Link href="/profil?tab=tehlukesizlik" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Şifrə dəyiş
                    </Link>
                    <div className="my-1 h-px bg-zinc-200" />
                    <button role="menuitem" onClick={logout} className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-100">
                      Çıxış
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href={`/daxil-ol?next=${nextParam}`} className="px-3 py-2 rounded-lg hover:bg-zinc-200">
                Daxil ol
              </Link>
              <Link href={`/qeydiyyat?next=${nextParam}`} className="px-3 py-2 rounded-lg hover:bg-zinc-200">
                Qeydiyyat
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
