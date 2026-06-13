import { useEffect, useState } from 'react';
import { EVENING_THEMES, RESPONSIBLE_DISCLAIMER, type RoomDTO } from '@toastup/shared';
import { useApp } from '../state';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';

export default function Home() {
  const { user, navigate, pendingInvite, clearPendingInvite } = useApp();
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.myRooms();
      setRooms(res.rooms);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (pendingInvite) setCode(pendingInvite);
  }, [pendingInvite]);

  async function join(inviteCode: string) {
    const value = inviteCode.trim();
    if (!value) return;
    setJoining(true);
    setError(null);
    haptic();
    try {
      const res = await api.joinRoom(value);
      clearPendingInvite();
      navigate('room', res.room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join room');
    } finally {
      setJoining(false);
    }
  }

  const greetingName = user?.firstName || user?.username || 'friend';

  return (
    <div className="flex flex-1 flex-col gap-5 p-5 pb-24 animate-fade-up">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Welcome back,</p>
          <h1 className="text-2xl font-bold">{greetingName} 👋</h1>
        </div>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          onClick={() => navigate('profile')}
          aria-label="Profile"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>🙂</span>
          )}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => navigate('create')}>
          ➕ Create Room
        </button>
        <a className="btn-secondary" href="#join">
          🔑 Join by Code
        </a>
      </div>

      <section id="join" className="card space-y-3">
        <p className="font-semibold">Join by code</p>
        <div className="flex gap-2">
          <input
            className="input uppercase"
            placeholder="ABC123"
            value={code}
            maxLength={16}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn-secondary" disabled={joining} onClick={() => join(code)}>
            Join
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your active rooms</h2>
        {loading ? (
          <p className="text-white/40">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="card text-white/50">
            No rooms yet. Create one and invite your friends! 🥂
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                className="card flex w-full items-center justify-between text-left hover:bg-white/10"
                onClick={() => navigate('room', room.id)}
              >
                <div>
                  <p className="font-semibold">{room.title}</p>
                  <p className="text-sm text-white/40">
                    {room.type === 'public' ? 'Public' : 'Private'} · code {room.inviteCode}
                  </p>
                </div>
                <span className="chip bg-white/5">
                  {room.participants?.length ?? 0} 👤
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Evening ideas</h2>
        <div className="grid grid-cols-2 gap-3">
          {EVENING_THEMES.map((theme) => (
            <button
              key={theme.id}
              className="card flex items-center gap-3 text-left hover:bg-white/10"
              onClick={() => navigate('create')}
            >
              <span className="text-2xl">{theme.emoji}</span>
              <span className="font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="mt-auto rounded-2xl bg-white/5 p-3 text-center text-xs text-white/40">
        ⚠️ {RESPONSIBLE_DISCLAIMER}
      </p>
    </div>
  );
}
