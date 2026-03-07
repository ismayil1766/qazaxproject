import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Self-service VIP has been disabled for launch hardening.
// VIP can only be changed from the admin panel.
export async function POST() {
  return NextResponse.json(
    { error: "VIP yalnız admin tərəfindən aktivləşdirilə bilər." },
    { status: 403 }
  );
}
