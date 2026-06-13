import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, Socket } from 'socket.io';
import {
  SocketClientEvents,
  SocketServerEvents,
  type GameNextPayload,
  type GameStartPayload,
  type RoomJoinPayload,
  type ToastSendPayload,
  type TypingPayload,
} from '@toastup/shared';
import { corsOrigins } from './env.js';
import { verifyToken } from './utils/jwt.js';
import { prisma } from './prisma.js';
import { filterText } from './utils/contentFilter.js';
import { getRandomQuestion, isGameType } from './services/gameService.js';
import { toGameDTO, toToastDTO } from './utils/mappers.js';

let io: IOServer | null = null;

interface SocketData {
  userId: string;
  telegramId: string;
}

export function initRealtime(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return next(new Error('Unauthorized'));
    }
    (socket.data as SocketData) = { userId: payload.userId, telegramId: payload.telegramId };
    next();
  });

  io.on('connection', (socket) => registerHandlers(socket));
  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

async function isParticipant(roomId: string, userId: string): Promise<boolean> {
  const p = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return !!p;
}

function registerHandlers(socket: Socket) {
  const data = socket.data as SocketData;

  socket.on(SocketClientEvents.RoomJoin, async (payload: RoomJoinPayload) => {
    try {
      const { roomId } = payload || {};
      if (!roomId || !(await isParticipant(roomId, data.userId))) {
        return socket.emit(SocketServerEvents.Error, { message: 'Not a participant of this room' });
      }
      socket.join(roomChannel(roomId));

      const participant = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: data.userId } },
        include: { user: true },
      });

      socket.to(roomChannel(roomId)).emit(SocketServerEvents.ParticipantJoined, {
        roomId,
        participant: participant
          ? {
              id: participant.id,
              userId: participant.userId,
              role: participant.role,
              joinedAt: participant.joinedAt.toISOString(),
              user: {
                id: participant.user.id,
                username: participant.user.username,
                firstName: participant.user.firstName,
                lastName: participant.user.lastName,
                avatarUrl: participant.user.avatarUrl,
              },
            }
          : null,
      });

      await emitRoomUpdate(roomId);
    } catch (err) {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to join room' });
    }
  });

  socket.on(SocketClientEvents.RoomLeave, async (payload: RoomJoinPayload) => {
    const { roomId } = payload || {};
    if (!roomId) return;
    socket.leave(roomChannel(roomId));
    socket.to(roomChannel(roomId)).emit(SocketServerEvents.ParticipantLeft, {
      roomId,
      userId: data.userId,
    });
    await emitRoomUpdate(roomId);
  });

  socket.on(SocketClientEvents.ToastSend, async (payload: ToastSendPayload) => {
    try {
      const { roomId, text } = payload || {};
      if (!roomId || !(await isParticipant(roomId, data.userId))) {
        return socket.emit(SocketServerEvents.Error, { message: 'Not a participant of this room' });
      }
      const result = filterText(text ?? '');
      if (!result.ok) {
        return socket.emit(SocketServerEvents.Error, { message: result.reason });
      }
      const toast = await prisma.toast.create({
        data: { roomId, userId: data.userId, text: result.cleaned },
        include: { user: true },
      });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.ToastNew, toToastDTO(toast));
    } catch {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to send toast' });
    }
  });

  socket.on(SocketClientEvents.ToastCountdown, async (payload: { roomId: string; seconds?: number }) => {
    const { roomId } = payload || {};
    if (!roomId || !(await isParticipant(roomId, data.userId))) return;
    const seconds = Math.min(Math.max(Number(payload.seconds ?? 3), 1), 10);
    getIO().to(roomChannel(roomId)).emit(SocketServerEvents.ToastCountdownUpdate, {
      roomId,
      seconds,
      startedBy: data.userId,
      startedAt: Date.now(),
    });
  });

  socket.on(SocketClientEvents.GameStart, async (payload: GameStartPayload) => {
    try {
      const { roomId, gameType } = payload || {};
      if (!roomId || !(await isParticipant(roomId, data.userId))) return;
      if (!isGameType(gameType)) {
        return socket.emit(SocketServerEvents.Error, { message: 'Unknown game type' });
      }
      const question = getRandomQuestion(gameType);
      const game = await prisma.gameSession.create({
        data: { roomId, gameType, status: 'active', currentQuestion: question },
      });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameStarted, toGameDTO(game));
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameQuestion, {
        roomId,
        gameId: game.id,
        question,
      });
    } catch {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to start game' });
    }
  });

  socket.on(SocketClientEvents.GameNext, async (payload: GameNextPayload) => {
    try {
      const { roomId } = payload || {};
      if (!roomId || !(await isParticipant(roomId, data.userId))) return;
      const game = await prisma.gameSession.findFirst({
        where: { roomId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      if (!game || !isGameType(game.gameType)) return;
      const question = getRandomQuestion(game.gameType, game.currentQuestion);
      const updated = await prisma.gameSession.update({
        where: { id: game.id },
        data: { currentQuestion: question },
      });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameQuestion, {
        roomId,
        gameId: updated.id,
        question,
      });
    } catch {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to advance game' });
    }
  });

  socket.on(SocketClientEvents.ParticipantTyping, (payload: TypingPayload) => {
    const { roomId, isTyping } = payload || {};
    if (!roomId) return;
    socket.to(roomChannel(roomId)).emit(SocketServerEvents.ParticipantTyping, {
      roomId,
      userId: data.userId,
      isTyping: !!isTyping,
    });
  });
}

/** Re-fetch a room with participants and broadcast a fresh snapshot. */
export async function emitRoomUpdate(roomId: string) {
  if (!io) return;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { participants: { include: { user: true } } },
  });
  if (!room) return;
  io.to(roomChannel(roomId)).emit(SocketServerEvents.RoomUpdate, {
    roomId,
    participants: room.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      role: p.role,
      joinedAt: p.joinedAt.toISOString(),
      user: {
        id: p.user.id,
        username: p.user.username,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        avatarUrl: p.user.avatarUrl,
      },
    })),
  });
}
