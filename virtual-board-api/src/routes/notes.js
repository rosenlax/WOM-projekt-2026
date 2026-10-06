const express = require('express');
const prisma = require('../prisma');

const router = express.Router();
const allowedColors = ['yellow', 'blue', 'green', 'pink', 'purple'];

async function getNoteWithAccess(noteId, userId) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return { status: 404 };

  const access = await prisma.boardAccess.findUnique({
    where: {
      userId_boardId: {
        userId,
        boardId: note.boardId
      }
    }
  });

  if (!access) return { status: 403 };
  return { status: 200, note };
}

// PATCH /notes/:id - ändra endast de värden som skickas
router.patch('/:id', async (req, res) => {
  const noteId = Number(req.params.id);

  if (!Number.isInteger(noteId)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }

  try {
    const result = await getNoteWithAccess(noteId, req.user.userId);

    if (result.status === 404) return res.status(404).json({ error: 'Note not found' });
    if (result.status === 403) return res.status(403).json({ error: 'No access to this board' });

    const data = {};

    if (req.body.text !== undefined) {
      if (typeof req.body.text !== 'string' || req.body.text.length > 1000) {
        return res.status(400).json({ error: 'Invalid note text' });
      }
      data.text = req.body.text;
    }

    if (req.body.x !== undefined) data.x = Number(req.body.x);
    if (req.body.y !== undefined) data.y = Number(req.body.y);

    if (req.body.color !== undefined) {
      if (!allowedColors.includes(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color' });
      }
      data.color = req.body.color;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No values to update' });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data
    });

    return res.status(200).json(updatedNote);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not update note' });
  }
});

// DELETE /notes/:id
router.delete('/:id', async (req, res) => {
  const noteId = Number(req.params.id);

  if (!Number.isInteger(noteId)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }

  try {
    const result = await getNoteWithAccess(noteId, req.user.userId);

    if (result.status === 404) return res.status(404).json({ error: 'Note not found' });
    if (result.status === 403) return res.status(403).json({ error: 'No access to this board' });

    await prisma.note.delete({ where: { id: noteId } });
    return res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not delete note' });
  }
});

module.exports = router;
