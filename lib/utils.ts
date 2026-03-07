export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export function toInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function allowedImagePath(pathname: string) {
  return pathname.startsWith("/media/") || pathname.startsWith("/uploads/");
}

export function normalizeListingImageUrls(images: unknown): string[] {
  const arr = Array.isArray(images)
    ? images.filter((x) => typeof x === "string") as string[]
    : safeJsonParse<string[]>(images, []);

  const allowedOrigins = [process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL]
    .filter(Boolean)
    .map((x) => String(x).replace(/\/$/, ""));

  return arr
    .map((raw) => String(raw || "").trim())
    .map((value) => {
      if (!value) return "";
      if (allowedImagePath(value)) return value;

      try {
        const url = new URL(value);
        const origin = url.origin.replace(/\/$/, "");
        if (allowedOrigins.includes(origin) && allowedImagePath(url.pathname)) {
          return `${url.pathname}${url.search}`;
        }
      } catch {}

      return "";
    })
    .filter(Boolean)
    .slice(0, 12);
}

export function normalizeImages(images: unknown): string[] {
  return normalizeListingImageUrls(images);
}

export function normalizeFlags(flags: unknown): Record<string, any> {
  if (flags && typeof flags === "object" && !Array.isArray(flags)) return flags as any;
  return safeJsonParse<Record<string, any>>(flags, {});
}

// AZ slug üçün sadə normalizasiya: boşluqları "-" edir, AZ hərfləri latın ekvivalenti ilə əvəz edir.
export function slugifyAz(input: string): string {
  const map: Record<string, string> = {
    "ə": "e",
    "ı": "i",
    "ö": "o",
    "ü": "u",
    "ç": "c",
    "ğ": "g",
    "ş": "s",
    "Ə": "e",
    "I": "i",
    "İ": "i",
    "Ö": "o",
    "Ü": "u",
    "Ç": "c",
    "Ğ": "g",
    "Ş": "s",
  };

  const raw = (input || "").trim();
  const replaced = raw
    .split("")
    .map((ch) => (map[ch] ? map[ch] : ch))
    .join("")
    .toLowerCase();

  return replaced
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
