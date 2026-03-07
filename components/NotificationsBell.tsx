"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NotificationsBell() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setCount(Number(d.count || 0));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <Link href="/bildirisler" className="relative px-3 py-2 rounded-lg hover:bg-zinc-200" aria-label="Bildirişlər">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute right-2 top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
