import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import extendedRoutes from './routes/extended.js';
import crudRoutes from './routes/crud.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import portalRoutes from './routes/portal.js';
import publicRoutes from './routes/public.js';
import platformRoutes from './routes/platform.js';
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

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes('*') || origins.includes(origin)) return cb(null, true);
      // Same-host SPA + API deployments (Railway public domain)
      return cb(null, origins.length === 0);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      service: 'waddani-api',
      db: 'up',
      version: process.env.RAILWAY_GIT_COMMIT_SHA || 'dev',
      time: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ ok: false, service: 'waddani-api', db: 'down' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
// Public donation + webhook routes must be mounted before auth-gated routers
// that apply `auth` middleware to the entire `/api` prefix.
app.use('/api', paymentRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api', platformRoutes);
app.use('/api', crudRoutes);
app.use('/api', extendedRoutes);
app.use('/api/analytics', analyticsRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistCandidates = [
  process.env.WEB_DIST_PATH,
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../../../apps/web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
  path.resolve(process.cwd(), 'web-dist'),
].filter(Boolean) as string[];

const webDist = webDistCandidates.find((candidate) => existsSync(path.join(candidate, 'index.html')));

if (webDist) {
  app.use(express.static(webDist, { index: false, maxAge: '7d' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err instanceof ZodError ? 400 : 500;
  res.status(status).json({ error: zodErrorMessage(err) });
});

const port = Number(process.env.PORT || process.env.API_PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`Waddani API listening on ${port}`));
