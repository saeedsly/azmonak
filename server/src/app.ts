import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/index.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const origins =
    config.corsOrigins === '*'
      ? true
      : config.corsOrigins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '8mb' }));

  app.use(
    '/uploads',
    express.static(config.storage.uploadDir, {
      maxAge: '7d',
      fallthrough: true,
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      app: config.appName,
      db: config.db.mode,
      time: Date.now(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/admin', requireAuth, adminRouter);

  const publicDir = config.storage.publicDir;
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
