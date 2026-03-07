import { prisma } from "@/lib/db";

export async function getAdminMfa() {
  const email = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "admin@example.com";
  const rec = await prisma.adminMfa.findUnique({ where: { id: 1 } });
  if (rec) {
    // keep email in sync if env changed
    if (rec.email !== email) {
      return await prisma.adminMfa.update({ where: { id: 1 }, data: { email } });
    }
    return rec;
  }
  return await prisma.adminMfa.create({ data: { id: 1, email } });
}
