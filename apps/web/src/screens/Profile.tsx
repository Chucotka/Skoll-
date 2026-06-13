import { useState } from 'react';
import { RESPONSIBLE_DISCLAIMER } from '@toastup/shared';
import { useApp } from '../state';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';

export default function Profile() {
  const { user, stats, navigate, logout } = useApp();
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    if (!window.confirm('Delete your account and all your rooms? This cannot be undone.')) return;
    setBusy(true);
    haptic();
    try {
      await api.deleteMe();
      logout();
    } catch {
      setBusy(false);
    }
  }

  const name = user?.firstName || user?.username || 'Guest';

  return (
    <div className="flex flex-1 flex-col gap-5 p-5 animate-fade-up">
      <button className="text-left text-white/50" onClick={() => navigate('home')}>
        ← Home
      </button>

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold-400/30 to-grape-500/30 text-3xl ring-1 ring-white/10">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{name}</h1>
          {user?.username && <p className="text-white/40">@{user.username}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-gold-400">{stats?.roomsVisited ?? 0}</p>
          <p className="text-sm text-white/50">Rooms visited</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-grape-400">{stats?.toastsSent ?? 0}</p>
          <p className="text-sm text-white/50">Toasts sent</p>
        </div>
      </div>

      <div className="card space-y-2">
        <p className="font-semibold">Privacy</p>
        <p className="text-sm text-white/50">
          Your data is used only to power your rooms and toasts. You can delete your account at any
          time — it removes your profile, rooms you host, and your toasts.
        </p>
      </div>

      <p className="rounded-2xl bg-white/5 p-3 text-center text-xs text-white/40">
        ⚠️ {RESPONSIBLE_DISCLAIMER}
      </p>

      <div className="mt-auto space-y-2">
        <button className="btn-ghost w-full" onClick={logout}>
          Log out
        </button>
        <button
          className="btn w-full bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
          disabled={busy}
          onClick={deleteAccount}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
