import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../prisma.js';

export interface AuthedUser {
  id: string;
  telegramId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = { id: user.id, telegramId: user.telegramId };
  next();
}
