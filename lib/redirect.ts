import { NextResponse } from "next/server";

/**
 * Railway və digər proxy arxitekturalarda req.url bəzən daxili host (0.0.0.0, localhost) olur.
 * Bu helper-lər public origin-i (x-forwarded-*) header-larından qurur və düzgün redirect edir.
 */
function getPublicOrigin(req: Request): string {
  const h = req.headers;
  const proto =
    h.get("x-forwarded-proto") ||
    (req.url.startsWith("https://") ? "https" : "http");
  const host =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    (() => {
      try {
        return new URL(req.url).host;
      } catch {
        return "";
      }
    })();

  if (!host) {
    // Worst-case fallback: req.url origin
    try {
      return new URL(req.url).origin;
    } catch {
      return "https://example.com";
    }
  }

  return `${proto}://${host}`;
}

function isBadOrigin(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return (
      u.hostname === "0.0.0.0" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost"
    );
  } catch {
    return true;
  }
}

function safeInternalTarget(origin: string, target: string, fallbackPath: string) {
  const raw = String(target || "").trim();
  const fallback = new URL(fallbackPath, origin).toString();
  if (!raw) return fallback;

  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

/** Redirect only to internal paths/URLs on the same public origin. */
export function redirectTo(req: Request, path: string, status: number = 303, fallbackPath: string = "/") {
  const origin = getPublicOrigin(req);
  const target = safeInternalTarget(origin, path, fallbackPath);
  return NextResponse.redirect(target, status);
}

/** Redirect back only when referer belongs to the same public origin. */
export function redirectBack(
  req: Request,
  fallbackPath: string = "/admin",
  status: number = 303
) {
  const origin = getPublicOrigin(req);
  const ref = req.headers.get("referer");
  if (ref && !isBadOrigin(ref)) {
    try {
      const refUrl = new URL(ref);
      if (refUrl.origin === origin) {
        return NextResponse.redirect(refUrl.toString(), status);
      }
    } catch {}
  }
  return redirectTo(req, fallbackPath, status, fallbackPath);
}


// Backwards-compatible named export used by some routes
export function publicOrigin(req: Request): string {
  return getPublicOrigin(req);
}
