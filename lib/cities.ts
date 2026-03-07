export const CITIES = ["Qazax", "Ağstafa"] as const;

export type City = (typeof CITIES)[number];

/**
 * Normalizes user input to our supported city set.
 * Returns undefined if city is empty or not supported.
 */
export function normalizeCity(city: string | null | undefined): City | undefined {
  if (!city) return undefined;
  const c = city.trim();
  // allow simple case-insensitive matching
  const found = (CITIES as readonly string[]).find((x) => x.toLowerCase() === c.toLowerCase());
  return found as City | undefined;
}
