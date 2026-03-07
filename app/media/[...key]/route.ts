import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, S3_ENABLED, s3 } from "@/lib/s3";
import path from "path";
import { existsSync } from "fs";
import { promises as fs } from "fs";

export const runtime = "nodejs";

// Proxies private bucket objects through the app origin.
// Usage: <img src="/media/uploads/abc.webp" />
export async function GET(_req: Request, ctx: { params: { key: string[] } }) {
  const key = (ctx.params.key || []).join("/");
  if (!key) return NextResponse.json({ error: "MISSING_KEY" }, { status: 400 });

  // Local fallback (dev): serve from UPLOADS_DIR or ./public/uploads when S3 is not configured.
  if (!S3_ENABLED || !s3) {
    // Only allow "uploads/<filename>" keys
    if (!key.startsWith("uploads/")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const filename = key.replace(/^uploads\//, "");
    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
    }
    const baseDir = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
    const fp = path.join(baseDir, filename);
    if (!existsSync(fp)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", "image/webp");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const file = await fs.readFile(fp);
    return new Response(file, { status: 200, headers });
  }

  try {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    if (!obj.Body) {
      return NextResponse.json({ error: "EMPTY_BODY" }, { status: 404 });
    }

    // AWS SDK v3 returns a Readable stream in Node runtime
    const body = obj.Body as any;

    const headers = new Headers();
    if (obj.ContentType) headers.set("Content-Type", obj.ContentType);
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
    // Long cache for immutable uploads (filename is random UUID-based)
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (obj.ETag) headers.set("ETag", obj.ETag);

    return new Response(body, { status: 200, headers });
  } catch (e: any) {
    const name = e?.name || e?.Code || "";
    const status = name === "NoSuchKey" || name === "NotFound" ? 404 : 500;
    return NextResponse.json(
      { error: "GET_OBJECT_FAILED", name, message: e?.message || String(e) },
      { status }
    );
  }
}
