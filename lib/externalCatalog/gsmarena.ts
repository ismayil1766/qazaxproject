type Cache<T> = { ts: number; value: T };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let brandsCache: Cache<{ brands: string[]; hrefByBrandLower: Record<string, string> }> | null = null;
const modelsCache = new Map<string, Cache<string[]>>();

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function uniqSorted(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => String(s || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

async function fetchTextWithTimeout(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; QazaxAgstafaBot/1.0; +https://example.invalid)"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchGsmarenaBrands(): Promise<string[]> {
  const now = Date.now();
  if (brandsCache && now - brandsCache.ts < ONE_DAY_MS) return brandsCache.value.brands;

  const html = await fetchTextWithTimeout("https://www.gsmarena.com/makers.php3");
  // Makers page: <td><a href="samsung-phones-9.php">Samsung</a></td> ...
  const re = /<a\s+href="([^"]+phones-[0-9]+\.php)"[^>]*>([^<]+)<\/a>/gi;

  const hrefByBrandLower: Record<string, string> = {};
  const brands: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    const name = decodeHtml(m[2]).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!hrefByBrandLower[key]) {
      hrefByBrandLower[key] = href.startsWith("http") ? href : `https://www.gsmarena.com/${href}`;
      brands.push(name);
    }
  }

  const out = uniqSorted(brands);
  brandsCache = { ts: now, value: { brands: out, hrefByBrandLower } };
  return out;
}

async function getBrandHref(brand: string): Promise<string | null> {
  const b = String(brand || "").trim();
  if (!b) return null;
  const now = Date.now();
  if (!brandsCache || now - brandsCache.ts >= ONE_DAY_MS) {
    await fetchGsmarenaBrands();
  }
  const href = brandsCache?.value.hrefByBrandLower[b.toLowerCase()];
  return href || null;
}

export async function fetchGsmarenaModels(brand: string): Promise<string[]> {
  const key = String(brand || "").trim().toLowerCase();
  if (!key) return [];
  const now = Date.now();

  const cached = modelsCache.get(key);
  if (cached && now - cached.ts < ONE_DAY_MS) return cached.value;

  const href = await getBrandHref(brand);
  if (!href) return [];

  const html = await fetchTextWithTimeout(href);

  // Brand page: device list items like <strong><span>Galaxy S24 Ultra</span></strong> or <h3>...</h3>
  // We'll pull titles from list blocks:
  const re = /<strong>\s*<span>([^<]+)<\/span>\s*<\/strong>/gi;

  const models: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = decodeHtml(m[1]).trim();
    if (name) models.push(name);
  }

  const out = uniqSorted(models);
  modelsCache.set(key, { ts: now, value: out });
  return out;
}
