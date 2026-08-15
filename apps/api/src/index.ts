import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import extendedRoutes from './routes/extended.js';
import crudRoutes from './routes/crud.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import { getJwtSecret, zodErrorMessage } from './lib/helpers.js';
import { prisma } from './lib/prisma.js';

// Fail fast if JWT is missing/weak.
getJwtSecret();

const app = express();
app.set('trust proxy', 1);

const origins = (process.env.WEB_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: origins.length ? origins : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'waddani-api', db: 'up' });
  } catch {
    res.status(503).json({ ok: false, service: 'waddani-api', db: 'down' });
  }
});

app.use('/api/auth', authRoutes);
// Public donation + webhook routes must be mounted before auth-gated routers
// that apply `auth` middleware to the entire `/api` prefix.
app.use('/api', paymentRoutes);
app.use('/api', crudRoutes);
app.use('/api', extendedRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err instanceof ZodError ? 400 : 500;
  res.status(status).json({ error: zodErrorMessage(err) });
});

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => console.log(`Waddani API listening on ${port}`));
