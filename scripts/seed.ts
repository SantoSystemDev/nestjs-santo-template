// scripts/seed.ts
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Roles como const para evitar problemas de ESM
const RoleEnum = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@salakup.com'.toLowerCase();
  const password = 'ChangeMe!123'; // only dev
  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // upsert user
  const user = await prisma.user.upsert({
    create: {
      fullName: 'Admin User',
      email,
      passwordHash: hash,
      isActive: true,
      emailVerified: true,
    },
    update: {
      passwordHash: hash,
      isActive: true,
      emailVerified: true,
      updatedAt: new Date(),
    },
    where: { email },
  });

  // ensure role admin
  await prisma.userRole.upsert({
    create: {
      userId: user.id,
      name: RoleEnum.ADMIN,
      description: 'System administrator',
    },
    update: { updatedAt: new Date() },
    where: { userId_name: { userId: user.id, name: RoleEnum.ADMIN } },
  });

  console.log('Seed done. Admin:', { email, password });
}

main().finally(() => prisma.$disconnect());
