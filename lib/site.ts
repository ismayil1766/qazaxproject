
export function getSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (env && env.startsWith("http")) return env.replace(/\/$/,"");
  return "https://qazaxproject-production.up.railway.app";
}

export function promotionRequestsEnabled() {
  const raw = process.env.NEXT_PUBLIC_PROMOTION_REQUESTS_ENABLED ?? process.env.PROMOTION_REQUESTS_ENABLED ?? "0";
  return String(raw).trim() === "1";
}
