import { z } from 'zod';
import { MAX_ROOM_TITLE_LENGTH, MAX_TOAST_LENGTH } from '@toastup/shared';

export const authSchema = z.object({
  initData: z.string().optional(),
  // Dev-only direct login (used when ALLOW_DEV_AUTH=true and no Telegram).
  devUser: z
    .object({
      telegramId: z.string().min(1),
      username: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      avatarUrl: z.string().optional(),
    })
    .optional(),
});

export const updateMeSchema = z.object({
  isAdultConfirmed: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  title: z.string().trim().min(1).max(MAX_ROOM_TITLE_LENGTH),
  type: z.enum(['private', 'public']).default('private'),
  theme: z.string().trim().max(40).optional().nullable(),
});

export const joinRoomSchema = z.object({
  inviteCode: z.string().trim().min(3).max(16),
});

export const createToastSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TOAST_LENGTH).optional(),
  mood: z
    .enum(['funny', 'heartfelt', 'short', 'romantic', 'for_friends', 'birthday'])
    .optional(),
  generate: z.boolean().optional(),
});

export const startGameSchema = z.object({
  gameType: z.enum(['most_likely', 'truth_or_story', 'toast_card']),
});

export const createReportSchema = z.object({
  targetUserId: z.string().min(1),
  roomId: z.string().optional().nullable(),
  reason: z.string().trim().min(1).max(500),
});
