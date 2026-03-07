import { NextRequest, NextResponse } from "next/server";

function isSafeMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    if (!host) return true;
    return originHost === host;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  if (isSafeMethod(req.method)) return NextResponse.next();

  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "CSRF check failed" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
