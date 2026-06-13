import { useState } from 'react';
import { GAME_LABELS, type GameType } from '@toastup/shared';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';

interface Props {
  roomId: string;
  currentQuestion: string | null;
  currentGameType: GameType | null;
  onClose: () => void;
}

const GAME_ORDER: GameType[] = ['most_likely', 'truth_or_story', 'toast_card'];

export default function MiniGames({ roomId, currentQuestion, currentGameType, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(gameType: GameType) {
    setBusy(true);
    setError(null);
    haptic();
    try {
      await api.startGame(roomId, gameType);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start game');
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setBusy(true);
    setError(null);
    haptic();
    try {
      await api.nextGame(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not advance game');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-ink-700 p-5 ring-1 ring-white/10 animate-fade-up sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">🎲 Mini-Games</h2>
          <button className="text-white/40" onClick={onClose}>
            ✕
          </button>
        </div>

        {currentQuestion && currentGameType && (
          <div className="card mb-4 space-y-2 border border-grape-500/30 bg-grape-500/10">
            <p className="text-xs uppercase tracking-wide text-grape-400">
              {GAME_LABELS[currentGameType].emoji} {GAME_LABELS[currentGameType].label}
            </p>
            <p className="text-lg font-semibold">{currentQuestion}</p>
            <button className="btn-secondary w-full" disabled={busy} onClick={next}>
              Next question →
            </button>
          </div>
        )}

        <div className="space-y-2">
          {GAME_ORDER.map((g) => (
            <button
              key={g}
              className="card flex w-full items-center gap-3 text-left hover:bg-white/10"
              disabled={busy}
              onClick={() => start(g)}
            >
              <span className="text-2xl">{GAME_LABELS[g].emoji}</span>
              <span>
                <span className="block font-semibold">{GAME_LABELS[g].label}</span>
                <span className="block text-sm text-white/40">{GAME_LABELS[g].description}</span>
              </span>
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
