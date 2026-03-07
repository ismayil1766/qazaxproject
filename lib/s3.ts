import { S3Client } from "@aws-sdk/client-s3";

function pickEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const endpoint = pickEnv(["S3_ENDPOINT", "AWS_ENDPOINT_URL", "ENDPOINT_URL", "ENDPOINT"]);
const region = pickEnv(["S3_REGION", "AWS_REGION", "REGION"]) || "auto";
const bucket = pickEnv(["S3_BUCKET", "AWS_BUCKET", "BUCKET", "BUCKET_NAME"]);

const accessKeyId = pickEnv(["S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID", "ACCESS_KEY_ID"]);
const secretAccessKey = pickEnv(["S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY"]);

/**
 * S3 is optional in local dev.
 * If env vars are not provided, uploads fall back to local filesystem (see app/api/upload and /media route).
 */
export const S3_ENABLED = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
export const S3_BUCKET = bucket || "";

export const s3: S3Client | null = S3_ENABLED
  ? new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      // Railway Buckets use virtual-hosted–style URLs.
      forcePathStyle: false,
    })
  : null;
