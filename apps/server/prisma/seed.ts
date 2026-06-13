import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { telegramId: 'demo-host' },
    update: {},
    create: {
      telegramId: 'demo-host',
      username: 'toastup_demo',
      firstName: 'Demo',
      lastName: 'Host',
      isAdultConfirmed: true,
    },
  });
  console.log('Seeded demo user:', demo.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
