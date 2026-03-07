import { NextResponse } from "next/server";
import { getPhoneBrandOptions } from "@/lib/data";
import brandsJson from "@/lib/catalog/phoneBrands.json";
import modelsByBrand from "@/lib/catalog/phoneModelsByBrand.json";
import { fetchGsmarenaBrands } from "@/lib/externalCatalog/gsmarena";

export const runtime = "nodejs";

export async function GET() {
  // Tap.az may block or rate-limit server-side fetches in some deployments.
  // Keep the UI stable by using local catalogs as the primary source.
  const db = await getPhoneBrandOptions().catch(() => [] as string[]);
  const gsma = await fetchGsmarenaBrands().catch(() => [] as string[]);

  const set = new Set<string>();
  for (const b of brandsJson as any as string[]) set.add(String(b).trim());
  for (const b of Object.keys(modelsByBrand as any)) set.add(String(b).trim());
  for (const b of db) set.add(String(b).trim());
  for (const b of gsma) set.add(String(b).trim());

  const brands = Array.from(set)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "az"));

  return NextResponse.json({ brands });
}
