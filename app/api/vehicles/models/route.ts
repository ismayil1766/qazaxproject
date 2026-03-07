import { NextResponse } from "next/server";
import { getVehicleModelOptions } from "@/lib/data";
import modelsByMake from "@/lib/catalog/vehicleModelsByMake.json";
import { fetchVpicModels } from "@/lib/externalCatalog/vpic";
import { isTurboMake } from "@/lib/azCatalog/turboMakes";

export const runtime = "nodejs";

// Build a case-insensitive lookup (server-side only)
const makeKeyByLower = new Map<string, string>(
  Object.keys(modelsByMake as any).map((k) => [k.toLowerCase(), k])
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const makeRaw = (searchParams.get("make") || "").trim();

  if (!makeRaw) return NextResponse.json({ models: ["Digər"] });

  // Azerbaijan-only constraint (Turbo.az makes list)
  if (!isTurboMake(makeRaw)) {
    return NextResponse.json({ models: ["Digər"] });
  }

  const key = makeKeyByLower.get(makeRaw.toLowerCase()) ?? makeRaw;
  const fromJson = ((modelsByMake as any)[key] as string[] | undefined) ?? [];
  const fromDb = await getVehicleModelOptions(makeRaw).catch(() => []);
  const fromVpic = await fetchVpicModels(makeRaw).catch(() => [] as string[]);

  const set = new Set<string>();
  for (const m of fromJson) set.add(m);
  for (const m of fromVpic) set.add(m);
  for (const m of fromDb) set.add(m);

  // Always keep "Digər" as a safe fallback.
  set.add("Digər");

  const models = Array.from(set)
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "az"));

  return NextResponse.json({ models });
}
