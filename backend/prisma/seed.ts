/**
 * prisma/seed.ts
 * ─────────────────────────────────────────────────────
 * Creates the very first Super Admin account.
 * Run: npm run db:seed
 *
 * The email/password are read from .env so you don't
 * commit credentials to Git.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    console.error(
      "❌  Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env file first."
    );
    process.exit(1);
  }

  // Idempotent: don't create a duplicate if already seeded
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const avatar = name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      avatar,
      globalRole: Role.SUPER_ADMIN,
    },
  });

  console.log(`✅  Super admin created:`);
  console.log(`    ID:    ${admin.id}`);
  console.log(`    Email: ${admin.email}`);
  console.log(`    Name:  ${admin.name}`);
  console.log();
  console.log(`🔐  Login with: ${email} / ${password}`);
  console.log(`⚠️   Change the password after first login!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
