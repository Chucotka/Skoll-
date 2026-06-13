import { useState } from 'react';
import { EVENING_THEMES, type RoomDTO, type RoomType } from '@toastup/shared';
import { useApp } from '../state';
import { api } from '../lib/api';
import { haptic, getWebApp } from '../lib/telegram';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? '';

export default function CreateRoom() {
  const { navigate } = useApp();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RoomType>('private');
  const [theme, setTheme] = useState<string>('just_talk');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RoomDTO | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    if (!title.trim()) {
      setError('Please give your room a name.');
      return;
    }
    setBusy(true);
    setError(null);
    haptic();
    try {
      const res = await api.createRoom({ title: title.trim(), type, theme });
      setCreated(res.room);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room');
    } finally {
      setBusy(false);
    }
  }

  function inviteLink(room: RoomDTO) {
    if (BOT_USERNAME) return `https://t.me/${BOT_USERNAME}?startapp=${room.inviteCode}`;
    return `${window.location.origin}?startapp=${room.inviteCode}`;
  }

  async function copyLink(room: RoomDTO) {
    try {
      await navigator.clipboard.writeText(inviteLink(room));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed — long-press the link to copy.');
    }
  }

  function shareInTelegram(room: RoomDTO) {
    const url = inviteLink(room);
    const text = `Join my ToastUp room "${room.title}" 🥂`;
    const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    const wa = getWebApp();
    if (wa?.openTelegramLink) wa.openTelegramLink(share);
    else window.open(share, '_blank');
  }

  if (created) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-5 animate-fade-up">
        <button className="text-left text-white/50" onClick={() => navigate('home')}>
          ← Home
        </button>
        <div className="card space-y-4 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">Room created!</h1>
          <p className="text-white/60">{created.title}</p>
          <div className="rounded-2xl bg-ink-800 p-4">
            <p className="text-sm text-white/40">Invite code</p>
            <p className="text-3xl font-extrabold tracking-widest text-gold-400">
              {created.inviteCode}
            </p>
          </div>
          <div className="space-y-2">
            <button className="btn-primary w-full" onClick={() => copyLink(created)}>
              {copied ? '✓ Copied!' : '🔗 Copy Invite Link'}
            </button>
            <button className="btn-secondary w-full" onClick={() => shareInTelegram(created)}>
              📨 Share in Telegram
            </button>
            <button className="btn-ghost w-full" onClick={() => navigate('room', created.id)}>
              Enter Room →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-5 animate-fade-up">
      <button className="text-left text-white/50" onClick={() => navigate('home')}>
        ← Home
      </button>
      <h1 className="text-2xl font-bold">Create a room</h1>

      <div className="card space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-white/60">Room name</span>
          <input
            className="input"
            placeholder="Friday with the crew"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm text-white/60">Room type</span>
          <div className="grid grid-cols-2 gap-2">
            {(['private', 'public'] as RoomType[]).map((t) => (
              <button
                key={t}
                className={`chip py-2 capitalize ${
                  type === t ? 'bg-gold-500 text-ink-900' : 'bg-white/5 text-white/70'
                }`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-white/60">Evening theme</span>
          <div className="flex flex-wrap gap-2">
            {EVENING_THEMES.map((t) => (
              <button
                key={t.id}
                className={`chip py-2 ${
                  theme === t.id ? 'bg-grape-500 text-white' : 'bg-white/5 text-white/70'
                }`}
                onClick={() => setTheme(t.id)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button className="btn-primary w-full" disabled={busy} onClick={create}>
        {busy ? 'Creating…' : 'Create'}
      </button>
    </div>
  );
}
