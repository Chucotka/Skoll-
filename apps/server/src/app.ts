import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { corsOrigins } from './env.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { roomRouter } from './routes/rooms.js';
import { toastRouter } from './routes/toasts.js';
import { gameRouter } from './routes/games.js';
import { reportRouter } from './routes/reports.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.includes('*') ? true : corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '64kb' }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'toastup-server' }));

  app.use('/api/auth', authRouter);
  app.use('/api/me', userRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/rooms/:id/toasts', toastRouter);
  app.use('/api/rooms/:id/games', gameRouter);
  app.use('/api/reports', reportRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
