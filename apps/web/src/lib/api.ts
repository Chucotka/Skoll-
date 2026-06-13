import type {
  AuthResponse,
  GameSessionDTO,
  RoomDTO,
  ToastDTO,
  ToastMood,
  UserStats,
} from '@toastup/shared';

const API_BASE = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000') + '/api';

let token: string | null = localStorage.getItem('toastup_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('toastup_token', t);
  else localStorage.removeItem('toastup_token');
}

export function getToken() {
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  authTelegram: (body: { initData?: string; devUser?: Record<string, string> }) =>
    request<AuthResponse>('/auth/telegram', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<{ user: AuthResponse['user']; stats: UserStats }>('/me'),
  updateMe: (body: { isAdultConfirmed?: boolean }) =>
    request<{ user: AuthResponse['user'] }>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMe: () => request<{ ok: boolean }>('/me', { method: 'DELETE' }),

  createRoom: (body: { title: string; type: 'private' | 'public'; theme?: string | null }) =>
    request<{ room: RoomDTO }>('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  myRooms: () => request<{ rooms: RoomDTO[] }>('/rooms/my'),
  getRoom: (id: string) => request<{ room: RoomDTO }>(`/rooms/${id}`),
  joinRoom: (inviteCode: string) =>
    request<{ room: RoomDTO }>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
  leaveRoom: (id: string) =>
    request<{ ok: boolean }>(`/rooms/${id}/leave`, { method: 'POST' }),

  getToasts: (roomId: string) => request<{ toasts: ToastDTO[] }>(`/rooms/${roomId}/toasts`),
  sendToast: (roomId: string, body: { text?: string; mood?: ToastMood; generate?: boolean }) =>
    request<{ toast: ToastDTO }>(`/rooms/${roomId}/toasts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  startGame: (roomId: string, gameType: string) =>
    request<{ game: GameSessionDTO }>(`/rooms/${roomId}/games/start`, {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    }),
  nextGame: (roomId: string) =>
    request<{ game: GameSessionDTO }>(`/rooms/${roomId}/games/next`, { method: 'POST' }),

  report: (body: { targetUserId: string; roomId?: string | null; reason: string }) =>
    request<{ ok: boolean }>('/reports', { method: 'POST', body: JSON.stringify(body) }),
};
