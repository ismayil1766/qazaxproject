import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Şifrə bərpası bu versiyada admin dəstəyi ilə edilir." },
    { status: 400 }
  );
}
