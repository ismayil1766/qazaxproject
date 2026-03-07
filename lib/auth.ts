import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

const SESSION_COOKIE = "seher_session";
const SESSION_TTL_DAYS = 14;

export type PublicUser = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function randomToken() {
  // 32 bytes url-safe
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parseCookie(cookieHeader);
  return cookies[SESSION_COOKIE] || null;
}

export async function getUserFromRequest(req: Request): Promise<PublicUser | null> {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    // best-effort cleanup
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  if (session.user.isBlocked) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: (session.user as any).role ?? "USER",
    name: session.user.name,
    lastName: (session.user as any).lastName ?? null,
    phone: (session.user as any).phone ?? null,
    avatarUrl: (session.user as any).avatarUrl ?? null,
  };
}

export async function requireUser(req: Request): Promise<PublicUser> {
  const u = await getUserFromRequest(req);
  if (!u) {
    const err: any = new Error("AUTH_REQUIRED");
    err.status = 401;
    throw err;
  }
  return u;
}

export async function createSessionResponse(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const cookie = serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });

  return { cookie, expiresAt };
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
}
