import type { GameSessionDTO, RoomDTO, ToastDTO, UserDTO } from '@toastup/shared';

type AnyUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isAdultConfirmed: boolean;
  createdAt: Date;
};

export function toUserDTO(u: AnyUser): UserDTO {
  return {
    id: u.id,
    telegramId: u.telegramId,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    isAdultConfirmed: u.isAdultConfirmed,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toRoomDTO(room: any): RoomDTO {
  return {
    id: room.id,
    title: room.title,
    type: room.type,
    hostId: room.hostId,
    inviteCode: room.inviteCode,
    theme: room.theme,
    isActive: room.isActive,
    createdAt: room.createdAt.toISOString(),
    participants: room.participants?.map((p: any) => ({
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
  };
}

export function toToastDTO(t: any): ToastDTO {
  return {
    id: t.id,
    roomId: t.roomId,
    userId: t.userId,
    text: t.text,
    createdAt: t.createdAt.toISOString(),
    user: t.user
      ? {
          id: t.user.id,
          username: t.user.username,
          firstName: t.user.firstName,
          avatarUrl: t.user.avatarUrl,
        }
      : undefined,
  };
}

export function toGameDTO(g: any): GameSessionDTO {
  return {
    id: g.id,
    roomId: g.roomId,
    gameType: g.gameType,
    status: g.status,
    currentQuestion: g.currentQuestion,
    createdAt: g.createdAt.toISOString(),
  };
}
