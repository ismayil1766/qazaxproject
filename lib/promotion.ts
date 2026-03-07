import { normalizeFlags } from "@/lib/utils";

export type PromotionKind = "VIP" | "PREMIUM";
export type PromotionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
export type PromotionPaymentStatus = "UNPAID" | "PAID" | "WAIVED";

export type PromotionPlan = {
  days: number;
  price: number;
  currency: "AZN";
  label: string;
};

const DEFAULT_PLANS: Record<PromotionKind, PromotionPlan[]> = {
  VIP: [
    { days: 7, price: 5, currency: "AZN", label: "7 gün" },
    { days: 15, price: 9, currency: "AZN", label: "15 gün" },
    { days: 30, price: 15, currency: "AZN", label: "30 gün" },
  ],
  PREMIUM: [
    { days: 7, price: 3, currency: "AZN", label: "7 gün" },
    { days: 15, price: 5, currency: "AZN", label: "15 gün" },
    { days: 30, price: 9, currency: "AZN", label: "30 gün" },
  ],
};

function parseEnvPlans(raw: string | undefined, fallback: PromotionPlan[]) {
  if (!raw || !raw.trim()) return fallback;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [daysRaw, priceRaw] = entry.split(":").map((x) => x.trim());
      const days = Number(daysRaw);
      const price = Number(priceRaw);
      if (!Number.isFinite(days) || !Number.isFinite(price)) return null;
      const safeDays = Math.max(1, Math.min(365, Math.trunc(days)));
      const safePrice = Math.max(0, Math.trunc(price));
      return { days: safeDays, price: safePrice, currency: "AZN" as const, label: `${safeDays} gün` };
    })
    .filter(Boolean) as PromotionPlan[];

  if (!items.length) return fallback;
  const uniq = new Map<number, PromotionPlan>();
  for (const item of items) uniq.set(item.days, item);
  return [...uniq.values()].sort((a, b) => a.days - b.days);
}

export function getPromotionPlans(kind: PromotionKind): PromotionPlan[] {
  return kind === "VIP"
    ? parseEnvPlans(process.env.VIP_PRICE_PLANS, DEFAULT_PLANS.VIP)
    : parseEnvPlans(process.env.PREMIUM_PRICE_PLANS, DEFAULT_PLANS.PREMIUM);
}

export function normalizePromotionKind(value: unknown): PromotionKind | null {
  const v = String(value || "").trim().toUpperCase();
  return v === "VIP" || v === "PREMIUM" ? v : null;
}

export function normalizePlanDays(kind: PromotionKind, value: unknown): number {
  const plans = getPromotionPlans(kind);
  const n = Number(value);
  const safe = Number.isFinite(n) ? Math.trunc(n) : plans[0]?.days ?? 7;
  return plans.some((p) => p.days === safe) ? safe : (plans[0]?.days ?? 7);
}

export function getPromotionPlan(kind: PromotionKind, days: number): PromotionPlan {
  const plans = getPromotionPlans(kind);
  return plans.find((p) => p.days === days) ?? plans[0];
}

export function getPromotionEndDate(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getActivePromotionFlags(flagsInput: unknown, vipUntilInput?: Date | string | null, premiumUntilInput?: Date | string | null) {
  const flags = normalizeFlags(flagsInput) as Record<string, any>;
  const now = Date.now();
  const vipUntil = vipUntilInput ? new Date(vipUntilInput) : null;
  const premiumUntil = premiumUntilInput ? new Date(premiumUntilInput) : null;

  const vipActive = Boolean(flags.vip) && Boolean(vipUntil && vipUntil.getTime() > now);
  const premiumActive = Boolean(flags.premium) && Boolean(premiumUntil && premiumUntil.getTime() > now);

  return {
    flags: {
      ...flags,
      vip: vipActive,
      premium: premiumActive,
    },
    vipUntil: vipUntil && vipUntil.getTime() > now ? vipUntil.toISOString() : null,
    premiumUntil: premiumUntil && premiumUntil.getTime() > now ? premiumUntil.toISOString() : null,
  };
}

export function humanPromotionKind(kind: PromotionKind) {
  return kind === "VIP" ? "VIP" : "Premium";
}
