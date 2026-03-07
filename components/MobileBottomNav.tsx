"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; email: string; name?: string | null } | null;

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
    </svg>
  );
}

function Item({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs " +
        (active ? "text-violet-700" : "text-zinc-600")
      }
    >
      <span className={"" + (active ? "" : "")}>{children}</span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setUser(d.user);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const addHref = user ? "/yeni" : `/daxil-ol?next=${encodeURIComponent("/yeni")}`;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-6xl px-3 pb-3">
        <div className="rounded-3xl border bg-white/90 backdrop-blur shadow-lg overflow-visible">
          <div className="grid grid-cols-4 items-end">
            <Item href="/" label="Ana" active={pathname === "/"}>
              <IconHome />
            </Item>
            <Item href="/elanlar" label="Elanlar" active={pathname.startsWith("/elanlar") || pathname.startsWith("/elan/") }>
              <IconList />
            </Item>
            <Link
              href={addHref}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs"
            >
              <span className="ui-btn-primary flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg text-white">
                <IconPlus />
              </span>
              <span className="text-zinc-700 font-medium leading-none">Yeni elan</span>
            </Link>
            <Item href={user ? "/profil?tab=profil" : `/daxil-ol?next=${encodeURIComponent("/profil?tab=profil")}`} label="Profil" active={pathname.startsWith("/profil") }>
              <IconUser />
            </Item>
          </div>
        </div>
      </div>
    </div>
  );
}
