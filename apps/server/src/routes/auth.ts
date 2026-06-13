import { Router } from 'express';
import { env } from '../env.js';
import { prisma } from '../prisma.js';
import { authSchema } from '../validation/schemas.js';
import { validateInitData } from '../utils/telegram.js';
import { signToken } from '../utils/jwt.js';
import { toUserDTO } from '../utils/mappers.js';
import { HttpError } from '../middleware/errorHandler.js';

export const authRouter = Router();

interface NormalizedTelegramUser {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

/** POST /api/auth/telegram — validate initData (or dev user) and upsert the user. */
authRouter.post('/telegram', async (req, res, next) => {
  try {
    const { initData, devUser } = authSchema.parse(req.body);

    let normalized: NormalizedTelegramUser | null = null;

    if (initData && env.BOT_TOKEN) {
      const parsed = validateInitData(initData, env.BOT_TOKEN);
      if (!parsed) {
        throw new HttpError(401, 'Invalid Telegram initData signature');
      }
      normalized = {
        telegramId: String(parsed.user.id),
        username: parsed.user.username ?? null,
        firstName: parsed.user.first_name ?? null,
        lastName: parsed.user.last_name ?? null,
        avatarUrl: parsed.user.photo_url ?? null,
      };
    } else if (env.ALLOW_DEV_AUTH && devUser) {
      normalized = {
        telegramId: devUser.telegramId,
        username: devUser.username ?? null,
        firstName: devUser.firstName ?? null,
        lastName: devUser.lastName ?? null,
        avatarUrl: devUser.avatarUrl ?? null,
      };
    }

    if (!normalized) {
      throw new HttpError(
        401,
        'Authentication failed. Provide valid Telegram initData (or a devUser when ALLOW_DEV_AUTH is enabled).',
      );
    }

    const user = await prisma.user.upsert({
      where: { telegramId: normalized.telegramId },
      update: {
        username: normalized.username,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        avatarUrl: normalized.avatarUrl,
      },
      create: {
        telegramId: normalized.telegramId,
        username: normalized.username,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        avatarUrl: normalized.avatarUrl,
      },
    });

    const token = signToken({ userId: user.id, telegramId: user.telegramId });
    res.json({ token, user: toUserDTO(user) });
  } catch (err) {
    next(err);
  }
});
