import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";


export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  return NextResponse.json({ user });
}
