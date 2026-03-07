import { NextResponse } from "next/server";
import { TURBO_MAKES } from "@/lib/azCatalog/turboMakes";

export const runtime = "nodejs";

export async function GET() {
  // Azerbaijan-only makes: Turbo.az "Markalar" list snapshot.
  // Keeps the UX stable even if external sites are blocked.
  const makes = Array.from(new Set(TURBO_MAKES.map((m) => String(m).trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "az"));

  return NextResponse.json({ makes });
}
