import { redirectTo } from "@/lib/redirect";

export const runtime = "nodejs";

// Köhnə endpoint deaktiv edildi. Yeni MFA login: /api/admin/auth/start
export async function POST(req: Request) {
  return redirectTo(req, "/admin?err=mfa");
}
