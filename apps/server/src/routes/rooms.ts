import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createRoomSchema, joinRoomSchema } from '../validation/schemas.js';
import { generateInviteCode } from '../utils/code.js';
import { filterText } from '../utils/contentFilter.js';
import { toRoomDTO } from '../utils/mappers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitRoomUpdate } from '../realtime.js';
import { MAX_ROOM_TITLE_LENGTH } from '@toastup/shared';

export const roomRouter = Router();

roomRouter.use(requireAuth);

const roomInclude = {
  participants: { include: { user: true }, orderBy: { joinedAt: 'asc' as const } },
};

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateInviteCode();
    const exists = await prisma.room.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  return generateInviteCode(8);
}

/** POST /api/rooms — create a room, host joins automatically. */
roomRouter.post('/', async (req, res, next) => {
  try {
    const body = createRoomSchema.parse(req.body);
    const titleCheck = filterText(body.title, MAX_ROOM_TITLE_LENGTH);
    if (!titleCheck.ok) throw new HttpError(400, titleCheck.reason ?? 'Invalid title');

    const inviteCode = await uniqueInviteCode();
    const userId = req.user!.id;

    const room = await prisma.room.create({
      data: {
        title: titleCheck.cleaned,
        type: body.type,
        theme: body.theme ?? null,
        inviteCode,
        hostId: userId,
        participants: { create: { userId, role: 'host' } },
      },
      include: roomInclude,
    });

    res.status(201).json({ room: toRoomDTO(room) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/rooms/my — active rooms the user participates in. */
roomRouter.get('/my', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true, participants: { some: { userId: req.user!.id } } },
      include: roomInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ rooms: rooms.map(toRoomDTO) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/rooms/join — join by invite code. */
roomRouter.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = joinRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: roomInclude,
    });
    if (!room || !room.isActive) throw new HttpError(404, 'Room not found');

    await prisma.roomParticipant.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user!.id } },
      update: {},
      create: { roomId: room.id, userId: req.user!.id, role: 'guest' },
    });

    const fresh = await prisma.room.findUnique({ where: { id: room.id }, include: roomInclude });
    await emitRoomUpdate(room.id);
    res.json({ room: toRoomDTO(fresh) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/rooms/:id — room details (participants only). */
roomRouter.get('/:id', async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: roomInclude,
    });
    if (!room) throw new HttpError(404, 'Room not found');
    const isMember = room.participants.some((p) => p.userId === req.user!.id);
    if (!isMember) throw new HttpError(403, 'You are not a participant of this room');
    res.json({ room: toRoomDTO(room) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/rooms/:id/leave — leave a room (host leaving closes it). */
roomRouter.post('/:id/leave', async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const userId = req.user!.id;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new HttpError(404, 'Room not found');

    await prisma.roomParticipant.deleteMany({ where: { roomId, userId } });

    if (room.hostId === userId) {
      await prisma.room.update({ where: { id: roomId }, data: { isActive: false } });
    }
    await emitRoomUpdate(roomId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
