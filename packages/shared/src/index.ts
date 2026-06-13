/**
 * Shared types and constants used across the ToastUp web, server and bot apps.
 */

export type RoomType = 'private' | 'public';
export type ParticipantRole = 'host' | 'guest' | 'moderator';
export type GameType = 'most_likely' | 'truth_or_story' | 'toast_card';
export type GameStatus = 'active' | 'finished';

export type ToastMood =
  | 'funny'
  | 'heartfelt'
  | 'short'
  | 'romantic'
  | 'for_friends'
  | 'birthday';

export type EveningTheme =
  | 'birthday'
  | 'friday_night'
  | 'movie_night'
  | 'after_work'
  | 'just_talk';

export interface UserDTO {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isAdultConfirmed: boolean;
  createdAt: string;
}

export interface UserStats {
  roomsVisited: number;
  toastsSent: number;
}

export interface ParticipantDTO {
  id: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  user: Pick<UserDTO, 'id' | 'username' | 'firstName' | 'lastName' | 'avatarUrl'>;
}

export interface RoomDTO {
  id: string;
  title: string;
  type: RoomType;
  hostId: string;
  inviteCode: string;
  theme: EveningTheme | string | null;
  isActive: boolean;
  createdAt: string;
  participants?: ParticipantDTO[];
}

export interface ToastDTO {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt: string;
  user?: Pick<UserDTO, 'id' | 'username' | 'firstName' | 'avatarUrl'>;
}

export interface GameSessionDTO {
  id: string;
  roomId: string;
  gameType: GameType;
  status: GameStatus;
  currentQuestion: string | null;
  createdAt: string;
}

/** Auth response returned by POST /api/auth/telegram */
export interface AuthResponse {
  token: string;
  user: UserDTO;
}

/* ----------------------------- Socket.IO events ---------------------------- */

export const SocketClientEvents = {
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  ToastSend: 'toast:send',
  ToastCountdown: 'toast:countdown',
  GameStart: 'game:start',
  GameNext: 'game:next',
  ParticipantTyping: 'participant:typing',
} as const;

export const SocketServerEvents = {
  ParticipantJoined: 'participant:joined',
  ParticipantLeft: 'participant:left',
  ToastNew: 'toast:new',
  ToastCountdownUpdate: 'toast:countdown:update',
  GameStarted: 'game:started',
  GameQuestion: 'game:question',
  RoomUpdate: 'room:update',
  ParticipantTyping: 'participant:typing',
  Error: 'error',
} as const;

export interface RoomJoinPayload {
  roomId: string;
}
export interface ToastSendPayload {
  roomId: string;
  text: string;
}
export interface ToastCountdownPayload {
  roomId: string;
  seconds: number;
}
export interface GameStartPayload {
  roomId: string;
  gameType: GameType;
}
export interface GameNextPayload {
  roomId: string;
}
export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

/* --------------------------------- Content -------------------------------- */

export const EVENING_THEMES: { id: EveningTheme; label: string; emoji: string }[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'friday_night', label: 'Friday Night', emoji: '🌙' },
  { id: 'movie_night', label: 'Movie Night', emoji: '🎬' },
  { id: 'after_work', label: 'After Work', emoji: '💼' },
  { id: 'just_talk', label: 'Just Talk', emoji: '💬' },
];

export const TOAST_MOODS: { id: ToastMood; label: string; emoji: string }[] = [
  { id: 'funny', label: 'Funny', emoji: '😄' },
  { id: 'heartfelt', label: 'Heartfelt', emoji: '💖' },
  { id: 'short', label: 'Short', emoji: '⚡' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹' },
  { id: 'for_friends', label: 'For Friends', emoji: '🤝' },
  { id: 'birthday', label: 'Birthday', emoji: '🎉' },
];

export const GAME_LABELS: Record<GameType, { label: string; emoji: string; description: string }> = {
  most_likely: {
    label: 'Who is most likely to?',
    emoji: '🤔',
    description: 'A light question for the room — vote out loud together.',
  },
  truth_or_story: {
    label: 'Truth or Story',
    emoji: '📖',
    description: 'Safe and friendly prompts to share a little story.',
  },
  toast_card: {
    label: 'Toast Card',
    emoji: '🃏',
    description: 'Draw a warm toast card and read it to the room.',
  },
};

export const RESPONSIBLE_DISCLAIMER =
  'Please drink responsibly. This app is designed for communication and entertainment.';

export const MAX_TOAST_LENGTH = 500;
export const MAX_ROOM_TITLE_LENGTH = 60;
