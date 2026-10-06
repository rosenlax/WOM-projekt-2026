require('dotenv').config();

const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const boardsRouter = require('./routes/boards');
const notesRouter = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3002;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from .env');
  process.exit(1);
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:8080';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'virtual-board-api' });
});

// All routes below this line require a valid JWT
app.use(auth);
app.use('/boards', boardsRouter);
app.use('/notes', notesRouter);

app.listen(PORT, () => {
  console.log(`Virtual Board API running on port ${PORT}`);
});
