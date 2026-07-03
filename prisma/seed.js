// prisma/seed.js — initial admin user + starter data
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPin = await bcrypt.hash('1234', 10);
  const admin = await prisma.staff.upsert({
    where: { id: 'seed-admin' },
    update: {},
    create: {
      id: 'seed-admin',
      name: 'Admin',
      pin: adminPin,
      role: 'ADMIN',
    },
  });
  console.log(`Seeded admin staff (id: ${admin.id}, PIN: 1234 — change this immediately)`);

  await prisma.settings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      id: 'settings',
      name: "Karel's Flowers",
      taxRate: 1.0825,
    },
  });
  console.log('Seeded shop settings (tax rate 1.0825)');

  const category = await prisma.category.upsert({
    where: { id: 'seed-category-general' },
    update: {},
    create: {
      id: 'seed-category-general',
      name: 'General',
      description: 'Default starter category',
    },
  });
  console.log(`Seeded category: ${category.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
