export type VpicMake = { Make_ID?: number; Make_Name?: string };
export type VpicModel = { Model_ID?: number; Model_Name?: string };

type Cache<T> = { ts: number; value: T };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let makesCache: Cache<string[]> | null = null;
const modelsCache = new Map<string, Cache<string[]>>();

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function uniqSorted(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => String(s || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function fetchVpicMakes(): Promise<string[]> {
  const now = Date.now();
  if (makesCache && now - makesCache.ts < ONE_DAY_MS) return makesCache.value;

  const url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json";
  const data = await fetchJsonWithTimeout(url);
  const results: VpicMake[] = Array.isArray(data?.Results) ? data.Results : [];
  const makes = uniqSorted(results.map((r) => r.Make_Name || "").filter(Boolean));
  makesCache = { ts: now, value: makes };
  return makes;
}

export async function fetchVpicModels(make: string): Promise<string[]> {
  const key = String(make || "").trim();
  if (!key) return [];
  const now = Date.now();

  const cached = modelsCache.get(key.toLowerCase());
  if (cached && now - cached.ts < ONE_DAY_MS) return cached.value;

  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(key)}?format=json`;
  const data = await fetchJsonWithTimeout(url);
  const results: VpicModel[] = Array.isArray(data?.Results) ? data.Results : [];
  const models = uniqSorted(results.map((r) => r.Model_Name || "").filter(Boolean));

  modelsCache.set(key.toLowerCase(), { ts: now, value: models });
  return models;
}
