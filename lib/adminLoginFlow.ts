import crypto from "crypto";

const COOKIE = "admin_login_flow";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.OTP_SECRET || "dev-admin-secret";
}

export function makeFlowCookie(): string {
  const ts = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const h = crypto.createHmac("sha256", secret());
  h.update(`${ts}:${nonce}`);
  const sig = h.digest("hex");
  return `${ts}.${nonce}.${sig}`;
}

export function isFlowCookieValid(val: string | undefined | null): boolean {
  if (!val) return false;
  const [tsStr, nonce, sig] = val.split(".");
  const ts = Number(tsStr);
  if (!ts || !nonce || !sig) return false;
  // 15 dəq
  if (Date.now() - ts > 15 * 60 * 1000) return false;
  const h = crypto.createHmac("sha256", secret());
  h.update(`${ts}:${nonce}`);
  const exp = h.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
  } catch {
    return false;
  }
}

export function getFlowCookieName() {
  return COOKIE;
}
