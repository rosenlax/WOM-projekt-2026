const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

async function hasBoardAccess(userId, boardId) {
  const access = await prisma.boardAccess.findUnique({
    where: {
      userId_boardId: {
        userId,
        boardId
      }
    }
  });

  return Boolean(access);
}

// GET /boards - boards som användaren har rätt till
router.get('/', async (req, res) => {
  try {
    const accessRows = await prisma.boardAccess.findMany({
      where: { userId: req.user.userId },
      include: { board: true },
      orderBy: { boardId: 'asc' }
    });

    return res.status(200).json(accessRows.map((row) => row.board));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load boards' });
  }
});

// GET /boards/:boardId/notes
router.get('/:boardId/notes', async (req, res) => {
  const boardId = Number(req.params.boardId);

  if (!Number.isInteger(boardId)) {
    return res.status(400).json({ error: 'Invalid board id' });
  }

  try {
    if (!(await hasBoardAccess(req.user.userId, boardId))) {
      return res.status(403).json({ error: 'No access to this board' });
    }

    const notes = await prisma.note.findMany({
      where: { boardId },
      orderBy: { id: 'asc' }
    });

    return res.status(200).json(notes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load notes' });
  }
});

// POST /boards/:boardId/notes
router.post('/:boardId/notes', async (req, res) => {
  const boardId = Number(req.params.boardId);
  const { text = '', x = 40, y = 40, color = 'yellow' } = req.body;

  if (!Number.isInteger(boardId)) {
    return res.status(400).json({ error: 'Invalid board id' });
  }

  if (typeof text !== 'string' || text.length > 1000) {
    return res.status(400).json({ error: 'Invalid note text' });
  }

  try {
    if (!(await hasBoardAccess(req.user.userId, boardId))) {
      return res.status(403).json({ error: 'No access to this board' });
    }

    const note = await prisma.note.create({
      data: {
        boardId,
        text,
        x: Number(x),
        y: Number(y),
        color
      }
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not create note' });
  }
});

module.exports = router;
