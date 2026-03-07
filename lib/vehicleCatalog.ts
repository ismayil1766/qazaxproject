// Vehicle catalog helpers.
//
// Source: getFrontend/json-car-list (MIT) - car-list.json (updated March 2025).
// We also merge with DB values so the list grows automatically as users post ads.
//
// NOTE: models are served via /api/vehicles/models?make=... (server merges JSON + DB).

import vehicleMakes from "@/lib/catalog/vehicleMakes.json";

export const VEHICLE_MAKES: string[] = vehicleMakes as unknown as string[];

export function uniqSorted(items: string[]) {
  const set = new Set<string>();
  for (const i of items) if (i) set.add(i);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
