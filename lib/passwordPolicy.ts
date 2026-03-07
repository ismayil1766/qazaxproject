export type PasswordCheck = { ok: true } | { ok: false; error: string };

/**
 * Sayt üçün rahat, amma kifayət qədər təhlükəsiz şifrə qaydası:
 * - min 8, max 72
 * - ən az 1 hərf və 1 rəqəm
 * - boşluq olmasın
 */
export function checkPasswordPolicy(password: string): PasswordCheck {
  const p = String(password || "");
  if (p.length < 8) return { ok: false, error: "Şifrə ən az 8 simvol olmalıdır." };
  if (p.length > 72) return { ok: false, error: "Şifrə çox uzundur (max 72 simvol)." };
  if (/\s/.test(p)) return { ok: false, error: "Şifrədə boşluq olmaz." };
  if (!/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/.test(p)) return { ok: false, error: "Şifrədə ən az 1 hərf olmalıdır." };
  if (!/[0-9]/.test(p)) return { ok: false, error: "Şifrədə ən az 1 rəqəm olmalıdır." };
  return { ok: true };
}
