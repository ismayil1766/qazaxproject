import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getIp, rateLimit } from "@/lib/rateLimit";
import { csrfErrorResponse, enforceSameOrigin } from "@/lib/security";
import sharp from "sharp";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, S3_ENABLED, s3 } from "@/lib/s3";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

const MAX_FILES = 12;
// We compress images before storing. To avoid rejecting typical phone photos,
// keep a higher input limit and optimize server-side.
const MAX_INPUT_FILE_SIZE_BYTES = 60 * 1024 * 1024; // 60MB (phone photos), we compress before storing
const TARGET_OUTPUT_MAX_BYTES = 1_500_000; // ~1.5MB per image after compression

const IMAGE_MAX_WIDTH = Number(process.env.IMAGE_MAX_WIDTH || 1600);
const IMAGE_QUALITY = Number(process.env.IMAGE_QUALITY || 80);
const SHARP_LIMIT_INPUT_PIXELS = 40_000_000;

async function compressToWebp(input: Buffer) {
  // Try a few passes to hit TARGET_OUTPUT_MAX_BYTES without trashing quality.
  let width = IMAGE_MAX_WIDTH;
  let quality = IMAGE_QUALITY;
  let out = await sharp(input, { limitInputPixels: SHARP_LIMIT_INPUT_PIXELS })
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();

  // If already small enough, return.
  if (out.length <= TARGET_OUTPUT_MAX_BYTES) return out;

  for (let i = 0; i < 6; i++) {
    if (quality > 60) quality -= 10;
    else if (quality > 45) quality -= 5;
    else if (width > 1200) width -= 200;
    else break;

    out = await sharp(input, { limitInputPixels: SHARP_LIMIT_INPUT_PIXELS })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (out.length <= TARGET_OUTPUT_MAX_BYTES) return out;
  }

  return out;
}

export async function POST(req: Request) {
  try {
    enforceSameOrigin(req);
  } catch {
    return csrfErrorResponse();
  }

  // Only authenticated users can upload
  try {
    await requireUser(req);
  } catch (e: any) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: e?.status || 401 });
  }

  const ip = getIp(req);
  const rl = rateLimit(`upload:${ip}`, 60, 10 * 60 * 1000); // 60 uploads/10min per IP
  if (!rl.ok) return NextResponse.json({ error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });

  const form = await req.formData();
  const files = form.getAll("files").filter(Boolean) as File[];

  if (!files.length) {
    return NextResponse.json({ error: "Fayl tapılmadı" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maksimum ${MAX_FILES} şəkil yükləmək olar` }, { status: 400 });
  }

  const urls: string[] = [];

  for (const f of files.slice(0, MAX_FILES)) {
    if (typeof (f as any).size === "number" && (f as any).size > MAX_INPUT_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Şəkil qəbul olunmadı" }, { status: 413 });
    }

    // Basic MIME guard (still keep ext-based normalization)
    const mime = (f as any).type as string | undefined;
    if (mime && (!mime.startsWith("image/") || mime === "image/svg+xml")) {
      return NextResponse.json({ error: "Yalnız JPG, PNG, WEBP və bənzər şəkillər qəbul olunur" }, { status: 400 });
    }

    const filename = `${Date.now()}-${crypto.randomUUID()}.webp`;
    const key = `uploads/${filename}`;

    const input = Buffer.from(await f.arrayBuffer());

    // Auto-compress: rotate by EXIF, resize, and convert to WebP to save space.
    // Keeps quality good enough for marketplace photos.
    let output: Buffer;
    try {
      output = await compressToWebp(input);
    } catch {
      return NextResponse.json({ error: "Şəkil oxunmadı. Zədələnmiş və ya dəstəklənməyən fayldır." }, { status: 400 });
    }

    if (S3_ENABLED && s3) {
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: output,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
    } else {
      // Local fallback (dev): write to UPLOADS_DIR or ./public/uploads
      const baseDir = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(baseDir, { recursive: true });
      await fs.writeFile(path.join(baseDir, filename), output);
    }

    // Serve via our app route that redirects to a short-lived signed URL.
    urls.push(`/media/${key}`);
  }

  return NextResponse.json({ ok: true, urls });
}
