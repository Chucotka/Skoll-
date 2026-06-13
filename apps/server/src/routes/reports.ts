import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createReportSchema } from '../validation/schemas.js';
import { filterText } from '../utils/contentFilter.js';
import { HttpError } from '../middleware/errorHandler.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);

/** POST /api/reports — report a user for moderation review. */
reportRouter.post('/', async (req, res, next) => {
  try {
    const body = createReportSchema.parse(req.body);
    const reason = filterText(body.reason);
    if (!reason.ok) throw new HttpError(400, reason.reason ?? 'Invalid reason');
    if (body.targetUserId === req.user!.id) {
      throw new HttpError(400, 'You cannot report yourself');
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetUserId: body.targetUserId,
        roomId: body.roomId ?? null,
        reason: reason.cleaned,
      },
    });
    res.status(201).json({ ok: true, reportId: report.id });
  } catch (err) {
    next(err);
  }
});
