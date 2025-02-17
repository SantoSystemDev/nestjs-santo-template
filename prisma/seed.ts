import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding roles...');

  const roles = [
    { name: 'ADMIN', description: 'System administrator' },
    { name: 'USER', description: 'Regular user' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ Roles seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
