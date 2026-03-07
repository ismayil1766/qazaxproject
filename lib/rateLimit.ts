type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitBuckets: Map<string, Bucket> | undefined;
}

function store() {
  if (!globalThis.__rateLimitBuckets) globalThis.__rateLimitBuckets = new Map();
  return globalThis.__rateLimitBuckets;
}

/**
 * Sadə in-memory rate-limit.
 * Qeyd: multi-instance deploy-da paylaşılmır (Redis olsa daha yaxşıdır),
 * amma brute-force riskini xeyli azaldır.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const m = store();
  const now = Date.now();
  const b = m.get(key);
  if (!b || b.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    m.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  m.set(key, b);
  return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

export function getIp(req: Request) {
  // Vercel/Proxy: x-forwarded-for bir neçə ip ola bilər
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "unknown";
}
