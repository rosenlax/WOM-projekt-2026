require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const board = await prisma.board.upsert({
    where: { id: 1 },
    update: { name: 'Demo Board' },
    create: { id: 1, name: 'Demo Board' }
  });

  for (const userId of [1, 2]) {
    await prisma.boardAccess.upsert({
      where: { userId_boardId: { userId, boardId: board.id } },
      update: {},
      create: { userId, boardId: board.id }
    });
  }

  const count = await prisma.note.count({ where: { boardId: board.id } });
  if (count === 0) {
    await prisma.note.createMany({
      data: [
        { boardId: board.id, text: 'Welcome to Virtual Board', x: 70, y: 80, color: 'yellow' },
        { boardId: board.id, text: 'Drag me around', x: 340, y: 180, color: 'blue' }
      ]
    });
  }

  console.log('Seeded Demo Board with access for auth user IDs 1 and 2.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
