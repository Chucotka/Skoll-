import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token: getToken() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
