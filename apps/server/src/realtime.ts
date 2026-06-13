import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, Socket } from 'socket.io';
import {
  SocketClientEvents,
  SocketServerEvents,
  type GameAnswerPayload,
  type GameNextPayload,
  type GameStartPayload,
  type RoomJoinPayload,
  type ToastSendPayload,
  type TypingPayload,
  type WebrtcJoinPayload,
  type WebrtcPeer,
  type WebrtcSignalClientPayload,
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
  name: string;
}

/* ------------------- Interactive mini-game answer store -------------------- */
// In-memory per-game answers. Cleared whenever the question changes.
interface GameAnswerState {
  question: string;
  answers: Map<string, { name: string; answer: string }>;
}
const gameAnswers = new Map<string, GameAnswerState>();

/** Reset (or initialise) the collected answers for a game's current question. */
export function resetGameAnswers(gameId: string, question: string) {
  gameAnswers.set(gameId, { question, answers: new Map() });
}

function gameAnswersPayload(gameId: string) {
  const state = gameAnswers.get(gameId);
  return {
    gameId,
    question: state?.question ?? '',
    answers: state
      ? [...state.answers.entries()].map(([userId, v]) => ({ userId, name: v.name, answer: v.answer }))
      : [],
  };
}

export function initRealtime(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return next(new Error('Unauthorized'));
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return next(new Error('Unauthorized'));
    (socket.data as SocketData) = {
      userId: payload.userId,
      telegramId: payload.telegramId,
      name: user.firstName || user.username || 'Guest',
    };
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

function videoChannel(roomId: string): string {
  return `video:${roomId}`;
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
      resetGameAnswers(game.id, question);
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameStarted, toGameDTO(game));
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameQuestion, {
        roomId,
        gameId: game.id,
        question,
      });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameAnswers, gameAnswersPayload(game.id));
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
      resetGameAnswers(updated.id, question);
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameQuestion, {
        roomId,
        gameId: updated.id,
        question,
      });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameAnswers, gameAnswersPayload(updated.id));
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

  // ---- Interactive mini-game answers / votes ----
  socket.on(SocketClientEvents.GameAnswer, async (payload: GameAnswerPayload) => {
    try {
      const { roomId, gameId, answer } = payload || {};
      if (!roomId || !gameId || !(await isParticipant(roomId, data.userId))) return;
      const text = (answer ?? '').toString().trim().slice(0, 200);
      if (!text) return;
      let state = gameAnswers.get(gameId);
      if (!state) {
        const game = await prisma.gameSession.findUnique({ where: { id: gameId } });
        state = { question: game?.currentQuestion ?? '', answers: new Map() };
        gameAnswers.set(gameId, state);
      }
      state.answers.set(data.userId, { name: data.name, answer: text });
      getIO().to(roomChannel(roomId)).emit(SocketServerEvents.GameAnswers, gameAnswersPayload(gameId));
    } catch {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to submit answer' });
    }
  });

  // ---- Video call (WebRTC) signaling ----
  socket.on(SocketClientEvents.WebrtcJoin, async (payload: WebrtcJoinPayload) => {
    try {
      const { roomId } = payload || {};
      if (!roomId || !(await isParticipant(roomId, data.userId))) {
        return socket.emit(SocketServerEvents.Error, { message: 'Not a participant of this room' });
      }
      const channel = videoChannel(roomId);
      const existing = await getIO().in(channel).fetchSockets();
      const peers: WebrtcPeer[] = existing
        .filter((s) => s.id !== socket.id)
        .map((s) => {
          const d = s.data as SocketData;
          return { socketId: s.id, userId: d.userId, name: d.name };
        });

      await socket.join(channel);
      // Tell the newcomer who is already in the call.
      socket.emit(SocketServerEvents.WebrtcPeers, { roomId, peers });
      // Tell everyone else a new peer is here.
      socket.to(channel).emit(SocketServerEvents.WebrtcPeerJoined, {
        roomId,
        peer: { socketId: socket.id, userId: data.userId, name: data.name } satisfies WebrtcPeer,
      });
    } catch {
      socket.emit(SocketServerEvents.Error, { message: 'Failed to join video call' });
    }
  });

  socket.on(SocketClientEvents.WebrtcSignal, (payload: WebrtcSignalClientPayload) => {
    const { to, data: signal } = payload || {};
    if (!to) return;
    getIO().to(to).emit(SocketServerEvents.WebrtcSignal, {
      from: socket.id,
      fromUserId: data.userId,
      data: signal,
    });
  });

  socket.on(SocketClientEvents.WebrtcLeave, (payload: { roomId: string }) => {
    const { roomId } = payload || {};
    if (!roomId) return;
    socket.leave(videoChannel(roomId));
    socket.to(videoChannel(roomId)).emit(SocketServerEvents.WebrtcPeerLeft, { socketId: socket.id });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('video:')) {
        socket.to(room).emit(SocketServerEvents.WebrtcPeerLeft, { socketId: socket.id });
      }
    }
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
