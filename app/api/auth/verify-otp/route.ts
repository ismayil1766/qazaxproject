import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Bu saytda istifadəçi OTP girişi deaktiv edilib." },
    { status: 410 }
  );
}
