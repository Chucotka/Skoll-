import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { startGameSchema } from '../validation/schemas.js';
import { getRandomQuestion, isGameType } from '../services/gameService.js';
import { toGameDTO } from '../utils/mappers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getIO, resetGameAnswers } from '../realtime.js';
import { SocketServerEvents } from '@toastup/shared';

export const gameRouter = Router({ mergeParams: true });

gameRouter.use(requireAuth);

type RoomParams = { id: string };

async function assertParticipant(roomId: string, userId: string) {
  const p = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!p) throw new HttpError(403, 'You are not a participant of this room');
}

function broadcast(roomId: string, event: string, payload: unknown) {
  try {
    getIO().to(`room:${roomId}`).emit(event, payload);
  } catch {
    /* best-effort */
  }
}

/** POST /api/rooms/:id/games/start — start a new mini-game. */
gameRouter.post('/start', async (req, res, next) => {
  try {
    const roomId = (req.params as RoomParams).id;
    await assertParticipant(roomId, req.user!.id);
    const { gameType } = startGameSchema.parse(req.body);

    // Finish any previous active game in the room.
    await prisma.gameSession.updateMany({
      where: { roomId, status: 'active' },
      data: { status: 'finished' },
    });

    const question = getRandomQuestion(gameType);
    const game = await prisma.gameSession.create({
      data: { roomId, gameType, status: 'active', currentQuestion: question },
    });

    resetGameAnswers(game.id, question);
    const dto = toGameDTO(game);
    broadcast(roomId, SocketServerEvents.GameStarted, dto);
    broadcast(roomId, SocketServerEvents.GameQuestion, { roomId, gameId: game.id, question });
    broadcast(roomId, SocketServerEvents.GameAnswers, { gameId: game.id, question, answers: [] });
    res.status(201).json({ game: dto });
  } catch (err) {
    next(err);
  }
});

/** POST /api/rooms/:id/games/next — advance the current game to a new question. */
gameRouter.post('/next', async (req, res, next) => {
  try {
    const roomId = (req.params as RoomParams).id;
    await assertParticipant(roomId, req.user!.id);

    const game = await prisma.gameSession.findFirst({
      where: { roomId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (!game) throw new HttpError(404, 'No active game in this room');
    if (!isGameType(game.gameType)) throw new HttpError(400, 'Unknown game type');

    const question = getRandomQuestion(game.gameType, game.currentQuestion);
    const updated = await prisma.gameSession.update({
      where: { id: game.id },
      data: { currentQuestion: question },
    });

    resetGameAnswers(updated.id, question);
    const dto = toGameDTO(updated);
    broadcast(roomId, SocketServerEvents.GameQuestion, { roomId, gameId: updated.id, question });
    broadcast(roomId, SocketServerEvents.GameAnswers, { gameId: updated.id, question, answers: [] });
    res.json({ game: dto });
  } catch (err) {
    next(err);
  }
});
