require('dotenv').config();

const express = require('express');
const cors = require('cors');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from .env');
  process.exit(1);
}

// Browser-frontend körs från en annan origin, därför behövs CORS.
// I produktion sätts CORS_ORIGIN till frontendens riktiga URL.
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:8080';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'virtual-board-auth' });
});

app.use('/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Auth API running on port ${PORT}`);
});
