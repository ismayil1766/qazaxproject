export type TapPhoneBrand = {
  name: string;
  paramId: string; // p[749] value
  url: string;
};

type Cache<T> = { ts: number; value: T };

let brandsCache: Cache<TapPhoneBrand[]> | null = null;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCount(name: string): string {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

export async function fetchTapPhoneBrands(force = false): Promise<TapPhoneBrand[]> {
  if (!force && brandsCache && Date.now() - brandsCache.ts < ONE_DAY_MS) return brandsCache.value;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch("https://tap.az/elanlar/elektronika/telefonlar", {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; QazaxAgstafaBot/1.0)",
      accept: "text/html",
    },
    cache: "no-store",
    signal: ctrl.signal,
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`Tap.az fetch failed: ${res.status}`);
  const html = await res.text();

  const out: TapPhoneBrand[] = [];
  const seen = new Set<string>();

  // Example: <a href="/elanlar/elektronika/telefonlar?p%5B749%5D=3855">Apple iPhone</a>
  const re = /<a[^>]+href="([^"]*telefonlar[^"]*p%5B749%5D=(\d+)[^"]*)"[^>]*>([^<]+)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const href = m[1];
    const paramId = m[2];
    const name = stripCount(decodeHtml(m[3]));
    if (!name || !paramId) continue;
    const key = `${paramId}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = href.startsWith("http") ? href : `https://tap.az${href}`;
    out.push({ name, paramId, url });
  }

  out.sort((a, b) => a.name.localeCompare(b.name, "az"));
  brandsCache = { ts: Date.now(), value: out };
  return out;
}
