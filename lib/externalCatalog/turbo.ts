export type TurboMake = {
  id: string;
  slug: string;
  name: string;
  url: string;
};

type Cache<T> = { ts: number; value: T };

// Simple in-memory caches (per server instance)
let makesCache: Cache<TurboMake[]> | null = null;
const modelsCache = new Map<string, Cache<string[]>>();

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
  // "Lexus (470)" -> "Lexus"
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

export async function fetchTurboMakes(force = false): Promise<TurboMake[]> {
  if (!force && makesCache && Date.now() - makesCache.ts < ONE_DAY_MS) return makesCache.value;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch("https://turbo.az/", {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; QazaxAgstafaBot/1.0)",
      accept: "text/html",
    },
    cache: "no-store",
    signal: ctrl.signal,
  });
  clearTimeout(t);

  if (!res.ok) throw new Error(`Turbo.az fetch failed: ${res.status}`);
  const html = await res.text();

  const out: TurboMake[] = [];
  const seen = new Set<string>();

  // Example anchor: <a href="/makes/14-lexus">Lexus (470)</a>
  const re = /<a[^>]+href="\/(?:az\/)?makes\/(\d+)-([^"?#]+)[^"\n]*"[^>]*>([^<]+)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const id = m[1];
    const slug = m[2];
    const rawText = decodeHtml(m[3]);
    const name = stripCount(rawText);
    if (!name) continue;
    const key = `${id}-${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, slug, name, url: `https://turbo.az/makes/${id}-${slug}` });
  }

  out.sort((a, b) => a.name.localeCompare(b.name, "az"));
  makesCache = { ts: Date.now(), value: out };
  return out;
}

export async function fetchTurboModels(makeName: string): Promise<string[]> {
  const name = makeName.trim();
  if (!name) return ["Digər"];

  const cached = modelsCache.get(name.toLowerCase());
  if (cached && Date.now() - cached.ts < ONE_DAY_MS) return cached.value;

  const makes = await fetchTurboMakes();
  const make = makes.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (!make) {
    const fallback = ["Digər"];
    modelsCache.set(name.toLowerCase(), { ts: Date.now(), value: fallback });
    return fallback;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch(make.url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; QazaxAgstafaBot/1.0)",
      accept: "text/html",
    },
    cache: "no-store",
    signal: ctrl.signal,
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`Turbo.az make page fetch failed: ${res.status}`);
  const html = await res.text();

  // Models on make pages link to /autos?...q%5Bmodel%5D%5B%5D=<id>
  const models = new Set<string>();
  const re = /<a[^>]+href="\/autos\?[^"\n]*q%5Bmodel%5D%5B%5D=\d+[^"\n]*"[^>]*>([^<]+)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const text = decodeHtml(m[1]);
    if (!text) continue;
    if (/\bbax\b/i.test(text)) continue; // "...elanlara baxmaq" link
    models.add(text);
  }

  models.add("Digər");
  const list = Array.from(models).filter(Boolean).sort((a, b) => a.localeCompare(b, "az"));
  modelsCache.set(name.toLowerCase(), { ts: Date.now(), value: list });
  return list;
}
