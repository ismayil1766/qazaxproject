export const INTERNAL_EMAIL_DOMAIN = "local.qazax-agstafa.az";

export function normalizeEmail(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
}

export function digitsOnly(value: string | null | undefined) {
  return String(value || "").replace(/\D+/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  const digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith("994") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+994${digits.slice(1)}`;
  if (digits.length === 9) return `+994${digits}`;
  if (digits.startsWith("994") && digits.length > 12) return `+${digits}`;
  if (digits.length >= 7) return `+${digits}`;

  return null;
}

export function isLikelyEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  return Boolean(email && email.includes("@") && email.includes("."));
}

export function makeInternalEmailFromPhone(phone: string) {
  const digits = digitsOnly(phone);
  return `user-${digits}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalGeneratedEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && normalized.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`));
}

export function loginDisplayLabel(user: { name?: string | null; phone?: string | null; email?: string | null }) {
  const name = String(user.name || "").trim();
  if (name) return name;

  const phone = normalizePhone(user.phone);
  if (phone) return phone;

  if (user.email && !isInternalGeneratedEmail(user.email)) return String(user.email);

  return "İstifadəçi";
}
