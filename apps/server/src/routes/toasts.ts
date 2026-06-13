import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createToastSchema } from '../validation/schemas.js';
import { filterText } from '../utils/contentFilter.js';
import { generateToast } from '../services/aiToastService.js';
import { toToastDTO } from '../utils/mappers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getIO } from '../realtime.js';
import { SocketServerEvents } from '@toastup/shared';

export const toastRouter = Router({ mergeParams: true });

toastRouter.use(requireAuth);

type RoomParams = { id: string };

async function assertParticipant(roomId: string, userId: string) {
  const p = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!p) throw new HttpError(403, 'You are not a participant of this room');
}

/** POST /api/rooms/:id/toasts — send a toast (custom text or AI-generated). */
toastRouter.post('/', async (req, res, next) => {
  try {
    const roomId = (req.params as RoomParams).id;
    const userId = req.user!.id;
    await assertParticipant(roomId, userId);

    const body = createToastSchema.parse(req.body);

    let text = body.text ?? '';
    if (body.generate || !text) {
      text = await generateToast({ mood: body.mood });
    }

    const result = filterText(text);
    if (!result.ok) throw new HttpError(400, result.reason ?? 'Invalid toast');

    const toast = await prisma.toast.create({
      data: { roomId, userId, text: result.cleaned },
      include: { user: true },
    });

    const dto = toToastDTO(toast);
    try {
      getIO().to(`room:${roomId}`).emit(SocketServerEvents.ToastNew, dto);
    } catch {
      /* realtime is best-effort */
    }
    res.status(201).json({ toast: dto });
  } catch (err) {
    next(err);
  }
});

/** GET /api/rooms/:id/toasts — recent toasts for a room. */
toastRouter.get('/', async (req, res, next) => {
  try {
    const roomId = (req.params as RoomParams).id;
    await assertParticipant(roomId, req.user!.id);
    const toasts = await prisma.toast.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ toasts: toasts.reverse().map(toToastDTO) });
  } catch (err) {
    next(err);
  }
});
