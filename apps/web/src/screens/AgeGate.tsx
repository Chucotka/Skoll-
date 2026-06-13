import { useState } from 'react';
import { RESPONSIBLE_DISCLAIMER } from '@toastup/shared';
import Logo from '../components/Logo';
import { useApp } from '../state';
import { haptic } from '../lib/telegram';

export default function AgeGate() {
  const { confirmAge, error } = useApp();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function enter() {
    setBusy(true);
    setLocalError(null);
    haptic();
    try {
      await confirmAge();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-between p-6 animate-fade-up">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Logo size={96} />
        <div className="space-y-2">
          <h1 className="bg-gradient-to-r from-gold-400 to-grape-400 bg-clip-text text-4xl font-extrabold text-transparent">
            ToastUp
          </h1>
          <p className="text-lg text-white/70">
            An online table for friends, toasts, and evening games.
          </p>
        </div>

        <div className="card w-full text-left text-sm text-white/60">
          <p className="mb-2 font-semibold text-white/80">Before you enter</p>
          <p>
            ToastUp is about communication and light entertainment — not about drinking. It works
            just as well with tea, coffee, or anything alcohol-free.
          </p>
          <p className="mt-3 rounded-2xl bg-gold-500/10 p-3 text-gold-400">
            ⚠️ {RESPONSIBLE_DISCLAIMER}
          </p>
        </div>
      </div>

      <div className="safe-bottom space-y-3">
        {(localError || error) && (
          <p className="text-center text-sm text-red-400">{localError || error}</p>
        )}
        <button className="btn-primary w-full" disabled={busy} onClick={enter}>
          I am 18 or older
        </button>
        <button className="btn-ghost w-full" disabled={busy} onClick={enter}>
          Enter alcohol-free / just hang out
        </button>
        <p className="text-center text-xs text-white/30">
          By entering you confirm you are 18+ and agree to be kind to others.
        </p>
      </div>
    </div>
  );
}
