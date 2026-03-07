import crypto from "crypto";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";

type EncPayload = { iv: string; tag: string; data: string };

function getEncKey(): Buffer {
  const raw = process.env.ADMIN_MFA_ENC_KEY || process.env.OTP_SECRET || "dev-admin-mfa-key";
  // If base64-like, try decode; otherwise hash to 32 bytes.
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {}
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(secret: string): string {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncPayload = { iv: iv.toString("base64"), tag: tag.toString("base64"), data: enc.toString("base64") };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decryptSecret(encB64: string): string {
  const key = getEncKey();
  const jsonStr = Buffer.from(encB64, "base64").toString("utf8");
  const payload = JSON.parse(jsonStr) as EncPayload;
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const data = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret(); // base32
}

export function otpauthUrl(args: { email: string; secret: string }): string {
  const issuer = process.env.ADMIN_MFA_ISSUER || "QazaxAgstafaAlqiSatqi";
  return authenticator.keyuri(args.email, issuer, args.secret);
}

export function verifyTotp(args: { token: string; secret: string }): boolean {
  // allow small clock drift
  authenticator.options = { window: 1 };
  return authenticator.check(args.token, args.secret);
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 10 chars, grouped for readability
    const raw = crypto.randomBytes(6).toString("hex"); // 12 hex chars
    codes.push(raw.slice(0, 4) + "-" + raw.slice(4, 8) + "-" + raw.slice(8, 12));
  }
  return codes;
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of codes) {
    out.push(await bcrypt.hash(c, 10));
  }
  return out;
}

export async function consumeRecoveryCode(args: { code: string; hashesJson: string }): Promise<{ ok: boolean; newHashesJson: string }> {
  const hashes: string[] = (() => {
    try { return JSON.parse(args.hashesJson || "[]"); } catch { return []; }
  })();
  for (let i = 0; i < hashes.length; i++) {
    const h = hashes[i];
    const match = await bcrypt.compare(args.code, h);
    if (match) {
      hashes.splice(i, 1); // consume
      return { ok: true, newHashesJson: JSON.stringify(hashes) };
    }
  }
  return { ok: false, newHashesJson: JSON.stringify(hashes) };
}
