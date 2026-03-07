import { NextResponse } from "next/server";

/**
 * Minimal same-origin enforcement for cookie-authenticated POST requests.
 * - If the request has no Origin header (e.g., server-to-server), we allow it.
 * - If Origin exists, we require it to match the request Host (or X-Forwarded-Host).
 *
 * This is not a full CSRF solution, but it blocks the most common cross-site form/fetch attacks
 * for same-site deployments (like Railway custom domains).
 */
export function enforceSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // no browser origin header -> allow

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Invalid Origin header");
  }

  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "";

  if (!host) return;

  // host may include port; originHost also includes port if present
  if (originHost !== host) {
    throw new Error(`Origin mismatch: ${originHost} !== ${host}`);
  }
}

export function csrfErrorResponse() {
  return NextResponse.json(
    { ok: false, error: "CSRF check failed" },
    { status: 403 }
  );
}
