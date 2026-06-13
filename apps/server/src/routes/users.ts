import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { updateMeSchema } from '../validation/schemas.js';
import { toUserDTO } from '../utils/mappers.js';
import { HttpError } from '../middleware/errorHandler.js';

export const userRouter = Router();

userRouter.use(requireAuth);

/** GET /api/me — current profile + lightweight stats. */
userRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'User not found');

    const [roomsVisited, toastsSent] = await Promise.all([
      prisma.roomParticipant.count({ where: { userId } }),
      prisma.toast.count({ where: { userId } }),
    ]);

    res.json({ user: toUserDTO(user), stats: { roomsVisited, toastsSent } });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/me — update profile (e.g. confirm 18+). */
userRouter.patch('/', async (req, res, next) => {
  try {
    const body = updateMeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...(body.isAdultConfirmed !== undefined && { isAdultConfirmed: body.isAdultConfirmed }) },
    });
    res.json({ user: toUserDTO(user) });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/me — delete account and cascade owned data. */
userRouter.delete('/', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
