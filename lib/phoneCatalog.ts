// Phone brands catalog for dropdowns.
//
// Source: khanatel/phone-datasource (brand_models.json).
// Models are served via /api/phones/models?brand=... (server merges JSON + DB).

import phoneBrands from "@/lib/catalog/phoneBrands.json";

export const PHONE_BRANDS: string[] = phoneBrands as unknown as string[];
