import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Self-service Premium has been disabled for launch hardening.
// Premium can only be changed from the admin panel.
export async function POST() {
  return NextResponse.json(
    { error: "Premium yalnız admin tərəfindən aktivləşdirilə bilər." },
    { status: 403 }
  );
}
