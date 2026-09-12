require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const candidateRoutes = require('./routes/candidate.routes');

const app = express();

// Allows access from any origin listed in CORS_ORIGINS — needed since
// the admin site, candidate site, and API may all be on different domains/networks.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', true); // needed for correct req.ip behind a hosting provider's proxy

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const runLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/candidate/attempts/:attemptId/questions/:questionId/run', runLimiter);
app.use('/api/candidate', candidateRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Exam portal API listening on port ${PORT}`));
