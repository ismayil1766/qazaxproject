import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET, S3_ENABLED } from "@/lib/s3";
import path from "path";
import { promises as fs } from "fs";

/**
 * Convert stored image URL (e.g. "/media/uploads/x.webp") to the bucket key ("uploads/x.webp").
 * Accepts keys directly as well.
 */
export function imageUrlToKey(urlOrKey: string): string {
  const v = (urlOrKey || "").trim();
  if (!v) return v;
  if (v.startsWith("/media/")) return v.replace(/^\/media\//, "");
  const idx = v.indexOf("/media/");
  if (idx !== -1) return v.slice(idx + "/media/".length);
  return v;
}

export async function deleteImagesFromBucket(urlsOrKeys: string[]) {
  const keys = (urlsOrKeys || [])
    .map(imageUrlToKey)
    .filter((k) => k && !k.endsWith("/"));
  if (!keys.length) return;

  if (S3_ENABLED) {
    // NOTE: `s3` is an imported live binding, so TS won't always narrow inside closures.
    // Capture to a local const to make type narrowing stable.
    const client = s3;
    const bucket = S3_BUCKET;
    if (client && bucket) {
      // Best-effort delete (don't fail the whole request if one key is missing)
      await Promise.allSettled(
        keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key })))
      );
      return;
    }
  }

  // Local fallback (dev): delete from UPLOADS_DIR or ./public/uploads
  const baseDir = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
  await Promise.allSettled(
    keys
      .filter((k) => k.startsWith("uploads/"))
      .map(async (k) => {
        const filename = k.replace(/^uploads\//, "");
        if (filename.includes("..") || filename.includes("/")) return;
        await fs.unlink(path.join(baseDir, filename)).catch(() => {});
      })
  );
}
