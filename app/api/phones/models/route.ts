import { NextResponse } from "next/server";
import { getPhoneModelOptions } from "@/lib/data";
import modelsByBrand from "@/lib/catalog/phoneModelsByBrand.json";
import { fetchGsmarenaModels } from "@/lib/externalCatalog/gsmarena";

export const runtime = "nodejs";

const brandKeyByLower = new Map<string, string>(
  Object.keys(modelsByBrand as any).map((k) => [k.toLowerCase(), k])
);

function normalizeBrand(brand: string) {
  const b = brand.trim();
  // Tap.az uses "Apple iPhone" as a brand label.
  if (/^apple\s+iphone$/i.test(b)) return "Apple";
  return b;
}

function resolveBrandKey(brand: string) {
  const lower = brand.toLowerCase();
  const direct = brandKeyByLower.get(lower);
  if (direct) return direct;
  // Many catalogs use underscores instead of spaces (e.g. Sony_Ericsson).
  const underscore = lower.replace(/[\s\-]+/g, "_");
  const underscoredKey = brandKeyByLower.get(underscore);
  if (underscoredKey) return underscoredKey;
  // Try removing underscores (rare)
  const deunderscore = lower.replace(/_/g, " ");
  return brandKeyByLower.get(deunderscore) ?? brand;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brand = normalizeBrand(searchParams.get("brand") || "");

  if (!brand) return NextResponse.json({ models: ["Digər"] });

  const key = resolveBrandKey(brand);
  const fromJson = ((modelsByBrand as any)[key] as string[] | undefined) ?? [];
  const fromDb = await getPhoneModelOptions(brand).catch(() => []);
  const fromGsma = await fetchGsmarenaModels(brand).catch(() => [] as string[]);

  const set = new Set<string>();
  for (const m of fromJson) set.add(m);
  for (const m of fromGsma) set.add(m);
  for (const m of fromDb) set.add(m);
  set.add("Digər");

  const models = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ models });
}
