import { prisma } from "@/lib/db";

export async function notifyUser(args: {
  userId: string;
  title: string;
  body?: string | null;
  href?: string | null;
  kind?: "LISTING" | "SECURITY" | "SYSTEM";
}) {
  const { userId, title, body = null, href = null, kind = "SYSTEM" } = args;
  await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      href,
      kind,
    },
  });
}
