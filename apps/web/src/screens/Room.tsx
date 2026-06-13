import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_LABELS,
  SocketClientEvents,
  SocketServerEvents,
  type GameAnswerDTO,
  type GameAnswersUpdate,
  type GameType,
  type ParticipantDTO,
  type RoomDTO,
  type ToastDTO,
} from '@toastup/shared';
import { useApp } from '../state';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { haptic, getWebApp } from '../lib/telegram';
import ToastModal from '../components/ToastModal';
import MiniGames from '../components/MiniGames';
import VideoCall from '../components/VideoCall';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? '';

interface FeedItem {
  id: string;
  kind: 'toast' | 'event' | 'game';
  text: string;
  author?: string;
  ts: number;
}

function displayName(p: ParticipantDTO['user']): string {
  return p.firstName || p.username || 'Guest';
}

export default function Room() {
  const { currentRoomId, navigate, user } = useApp();
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [participants, setParticipants] = useState<ParticipantDTO[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [cheers, setCheers] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [gameId, setGameId] = useState<string | null>(null);
  const [gameQuestion, setGameQuestion] = useState<string | null>(null);
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [gameAnswers, setGameAnswers] = useState<GameAnswerDTO[]>([]);

  const feedRef = useRef<HTMLDivElement>(null);

  const pushFeed = useCallback((item: Omit<FeedItem, 'id' | 'ts'>) => {
    setFeed((prev) => [
      ...prev.slice(-80),
      { ...item, id: Math.random().toString(36).slice(2), ts: Date.now() },
    ]);
  }, []);

  const triggerCheers = useCallback(() => {
    setCheers(true);
    haptic();
    setTimeout(() => setCheers(false), 900);
  }, []);

  // Initial load + socket wiring.
  useEffect(() => {
    if (!currentRoomId) {
      navigate('home');
      return;
    }
    let cancelled = false;

    async function init() {
      try {
        const [roomRes, toastRes] = await Promise.all([
          api.getRoom(currentRoomId!),
          api.getToasts(currentRoomId!),
        ]);
        if (cancelled) return;
        setRoom(roomRes.room);
        setParticipants(roomRes.room.participants ?? []);
        setFeed(
          toastRes.toasts.map((t: ToastDTO) => ({
            id: t.id,
            kind: 'toast' as const,
            text: t.text,
            author: t.user?.firstName || t.user?.username || 'Guest',
            ts: new Date(t.createdAt).getTime(),
          })),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open room');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();

    const socket = connectSocket();
    const join = () => socket.emit(SocketClientEvents.RoomJoin, { roomId: currentRoomId });
    if (socket.connected) join();
    socket.on('connect', join);

    socket.on(SocketServerEvents.ParticipantJoined, (p: { participant?: ParticipantDTO }) => {
      if (p.participant) pushFeed({ kind: 'event', text: `${displayName(p.participant.user)} joined the room` });
    });
    socket.on(SocketServerEvents.ParticipantLeft, () => {
      pushFeed({ kind: 'event', text: 'Someone left the room' });
    });
    socket.on(SocketServerEvents.RoomUpdate, (data: { participants: ParticipantDTO[] }) => {
      setParticipants(data.participants);
    });
    socket.on(SocketServerEvents.ToastNew, (t: ToastDTO) => {
      pushFeed({
        kind: 'toast',
        text: t.text,
        author: t.user?.firstName || t.user?.username || 'Guest',
      });
      triggerCheers();
    });
    socket.on(
      SocketServerEvents.ToastCountdownUpdate,
      (data: { seconds: number }) => startCountdown(data.seconds),
    );
    socket.on(SocketServerEvents.GameStarted, (g: { id: string; gameType: GameType }) => {
      setGameType(g.gameType);
      setGameId(g.id);
      setGameAnswers([]);
      pushFeed({ kind: 'game', text: `Game started: ${GAME_LABELS[g.gameType]?.label ?? g.gameType}` });
    });
    socket.on(SocketServerEvents.GameQuestion, (data: { gameId: string; question: string }) => {
      setGameId(data.gameId);
      setGameQuestion(data.question);
      setGameAnswers([]);
      pushFeed({ kind: 'game', text: data.question });
    });
    socket.on(SocketServerEvents.GameAnswers, (data: GameAnswersUpdate) => {
      setGameAnswers(data.answers);
    });
    socket.on(SocketServerEvents.Error, (e: { message?: string }) => {
      if (e?.message) setError(e.message);
    });

    return () => {
      cancelled = true;
      socket.emit(SocketClientEvents.RoomLeave, { roomId: currentRoomId });
      socket.off('connect', join);
      socket.off(SocketServerEvents.ParticipantJoined);
      socket.off(SocketServerEvents.ParticipantLeft);
      socket.off(SocketServerEvents.RoomUpdate);
      socket.off(SocketServerEvents.ToastNew);
      socket.off(SocketServerEvents.ToastCountdownUpdate);
      socket.off(SocketServerEvents.GameStarted);
      socket.off(SocketServerEvents.GameQuestion);
      socket.off(SocketServerEvents.GameAnswers);
      socket.off(SocketServerEvents.Error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [feed]);

  function startCountdown(seconds: number) {
    let n = seconds;
    setCountdown(n);
    const timer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(timer);
        setCountdown(null);
        triggerCheers();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  async function sendToast(text: string) {
    if (!currentRoomId) return;
    await api.sendToast(currentRoomId, { text });
  }

  function sharedToast() {
    const socket = connectSocket();
    socket.emit(SocketClientEvents.ToastCountdown, { roomId: currentRoomId, seconds: 3 });
  }

  function submitGameAnswer(answer: string) {
    if (!currentRoomId || !gameId) return;
    const socket = connectSocket();
    socket.emit(SocketClientEvents.GameAnswer, { roomId: currentRoomId, gameId, answer });
  }

  async function leave() {
    if (!currentRoomId) return;
    haptic();
    try {
      await api.leaveRoom(currentRoomId);
    } catch {
      /* ignore */
    }
    navigate('home');
  }

  function invite() {
    if (!room) return;
    const url = BOT_USERNAME
      ? `https://t.me/${BOT_USERNAME}?startapp=${room.inviteCode}`
      : `${window.location.origin}?startapp=${room.inviteCode}`;
    const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
      `Join my ToastUp room "${room.title}" 🥂`,
    )}`;
    const wa = getWebApp();
    if (wa?.openTelegramLink) wa.openTelegramLink(share);
    else {
      navigator.clipboard?.writeText(url).catch(() => undefined);
      window.open(share, '_blank');
    }
  }

  async function report(targetUserId: string) {
    if (!currentRoomId || targetUserId === user?.id) return;
    const reason = window.prompt('Report this participant — what happened?');
    if (!reason || !reason.trim()) return;
    try {
      await api.report({ targetUserId, roomId: currentRoomId, reason: reason.trim() });
      pushFeed({ kind: 'event', text: 'Report sent to moderators. Thank you for keeping the table safe.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/50">Opening room…</div>
    );
  }
  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-red-400">{error ?? 'Room not found'}</p>
        <button className="btn-ghost" onClick={() => navigate('home')}>
          ← Back home
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {countdown !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur">
          <p className="text-sm text-white/60">Shared toast in…</p>
          <p className="text-8xl font-extrabold text-gold-400">{countdown}</p>
        </div>
      )}
      {cheers && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <span className="animate-cheers text-8xl">🥂</span>
        </div>
      )}

      <header className="flex items-center gap-3 border-b border-white/5 p-4">
        <button className="text-white/50" onClick={() => navigate('home')}>
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold leading-tight">{room.title}</h1>
          <p className="text-xs text-white/40">
            Code {room.inviteCode} · {participants.length} online
          </p>
        </div>
        <button className="chip bg-white/5 text-red-300" onClick={leave}>
          Leave
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto p-3">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex shrink-0 flex-col items-center gap-1"
            style={{ width: 64 }}
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-400/30 to-grape-500/30 ring-1 ring-white/10">
                {p.user.avatarUrl ? (
                  <img src={p.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span>{displayName(p.user).charAt(0).toUpperCase()}</span>
                )}
              </div>
              {p.userId !== user?.id && (
                <button
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 text-[10px] ring-1 ring-white/10"
                  title="Report"
                  onClick={() => report(p.userId)}
                >
                  🚩
                </button>
              )}
            </div>
            <span className="max-w-full truncate text-[11px] text-white/60">
              {p.role === 'host' ? '👑 ' : ''}
              {displayName(p.user)}
            </span>
          </div>
        ))}
      </div>

      {room && (
        <VideoCall roomId={room.id} displayName={user?.firstName || user?.username || 'You'} visible={videoOpen} />
      )}

      <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {feed.length === 0 && (
          <p className="mt-8 text-center text-white/30">
            No activity yet. Raise the first toast! 🥂
          </p>
        )}
        {feed.map((item) => (
          <div
            key={item.id}
            className={`animate-fade-up rounded-2xl p-3 text-sm ${
              item.kind === 'toast'
                ? 'bg-gold-500/10 ring-1 ring-gold-500/20'
                : item.kind === 'game'
                  ? 'bg-grape-500/10 ring-1 ring-grape-500/20'
                  : 'bg-white/5 text-white/50'
            }`}
          >
            {item.kind === 'toast' && (
              <p className="mb-0.5 text-xs font-semibold text-gold-400">🥂 {item.author}</p>
            )}
            <p>{item.text}</p>
          </div>
        ))}
      </div>

      {error && <p className="px-4 text-center text-xs text-red-400">{error}</p>}

      <div className="safe-bottom space-y-2 border-t border-white/5 p-3">
        <button
          className="btn-primary w-full py-4 text-lg"
          onClick={() => {
            setToastOpen(true);
          }}
        >
          🥂 Raise a Toast
        </button>
        <div className="grid grid-cols-4 gap-2">
          <button className="btn-ghost text-sm" onClick={() => setToastOpen(true)}>
            ✨ AI
          </button>
          <button
            className={`btn-ghost text-sm ${videoOpen ? 'ring-2 ring-gold-500' : ''}`}
            onClick={() => setVideoOpen((v) => !v)}
          >
            📹 Video
          </button>
          <button className="btn-ghost text-sm" onClick={() => setGamesOpen(true)}>
            🎲 Games
          </button>
          <button className="btn-ghost text-sm" onClick={invite}>
            📨 Invite
          </button>
        </div>
        <button className="btn-secondary w-full" onClick={sharedToast}>
          ⏱️ Start shared toast countdown
        </button>
      </div>

      {toastOpen && <ToastModal onClose={() => setToastOpen(false)} onSend={sendToast} />}
      {gamesOpen && (
        <MiniGames
          roomId={room.id}
          gameId={gameId}
          currentQuestion={gameQuestion}
          currentGameType={gameType}
          participants={participants}
          answers={gameAnswers}
          onSubmitAnswer={submitGameAnswer}
          onClose={() => setGamesOpen(false)}
        />
      )}
    </div>
  );
}
