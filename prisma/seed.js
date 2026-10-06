require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('BoardDemo123!', 12);

  for (const username of ['demo1', 'demo2']) {
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash },
      create: { username, passwordHash }
    });
  }

  console.log('Seeded users: demo1 / demo2, password: BoardDemo123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
