import crypto from "crypto";
import { getUserFromRequest } from "@/lib/auth";

const COOKIE_NAME = "admin_session";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.OTP_SECRET || "dev-admin-secret";
}

export function allowLegacyAdminKeyFallback() {
  return process.env.ALLOW_ADMIN_KEY_FALLBACK === "1" && Boolean(process.env.ADMIN_KEY);
}

export function adminUser() {
  return process.env.ADMIN_USER || "admin";
}

export function adminPass() {
  return process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || "admin";
}

export function signAdminSession(ts: number, user: string) {
  const h = crypto.createHmac("sha256", secret());
  h.update(`${ts}:${user}`);
  return h.digest("hex");
}

export function makeAdminCookieValue(user: string) {
  const ts = Date.now();
  const sig = signAdminSession(ts, user);
  return `${ts}.${sig}`;
}

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function isAdminCookieValid(cookieHeader: string | null) {
  const cookies = parseCookieHeader(cookieHeader);
  const val = cookies[COOKIE_NAME];
  if (!val) return false;

  const [tsStr, sig] = val.split(".");
  const ts = Number(tsStr);
  if (!ts || !sig) return false;

  // 7 gün
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - ts > maxAgeMs) return false;

  const expected = signAdminSession(ts, adminUser());
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

// Admin yoxlaması: əvvəl DB rolu, sonra admin cookie.
// Legacy ?key=ADMIN_KEY fallback yalnız ALLOW_ADMIN_KEY_FALLBACK=1 olduqda aktivdir.
export async function requireAdmin(req: Request, keyFallback?: string) {
  // Preferred: logged-in user with ADMIN role in DB
  const u = await getUserFromRequest(req);
  if (u && u.role === "ADMIN") return true;

  // Backwards-compatible fallbacks (env-based)
  const cookieHeader = req.headers.get("cookie");
  if (isAdminCookieValid(cookieHeader)) return true;
  if (allowLegacyAdminKeyFallback() && keyFallback && keyFallback === process.env.ADMIN_KEY) return true;
  return false;
}
