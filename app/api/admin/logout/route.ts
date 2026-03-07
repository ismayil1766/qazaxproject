import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/adminAuth";
import { getFlowCookieName } from "@/lib/adminLoginFlow";
import { publicOrigin } from "@/lib/redirect";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin", publicOrigin(req)), 303);
  res.cookies.set(getAdminCookieName(), "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0, secure: process.env.NODE_ENV === "production" });
  res.cookies.set(getFlowCookieName(), "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0, secure: process.env.NODE_ENV === "production" });
  return res;
}
