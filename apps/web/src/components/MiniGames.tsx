import { useMemo, useState } from 'react';
import {
  GAME_LABELS,
  type GameAnswerDTO,
  type GameType,
  type ParticipantDTO,
} from '@toastup/shared';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';

interface Props {
  roomId: string;
  gameId: string | null;
  currentQuestion: string | null;
  currentGameType: GameType | null;
  participants: ParticipantDTO[];
  answers: GameAnswerDTO[];
  onSubmitAnswer: (answer: string) => void;
  onClose: () => void;
}

const GAME_ORDER: GameType[] = ['most_likely', 'truth_or_story', 'toast_card'];

function pName(p: ParticipantDTO['user']) {
  return p.firstName || p.username || 'Guest';
}

export default function MiniGames({
  roomId,
  gameId,
  currentQuestion,
  currentGameType,
  participants,
  answers,
  onSubmitAnswer,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyText, setStoryText] = useState('');
  const [answered, setAnswered] = useState(false);

  async function start(gameType: GameType) {
    setBusy(true);
    setError(null);
    setAnswered(false);
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
    setAnswered(false);
    setStoryText('');
    haptic();
    try {
      await api.nextGame(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not advance game');
    } finally {
      setBusy(false);
    }
  }

  function submit(answer: string) {
    if (!answer.trim()) return;
    haptic();
    onSubmitAnswer(answer.trim());
    setAnswered(true);
  }

  // Tally votes for "Who is most likely to?" (answer = voted userId).
  const voteTally = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of answers) counts.set(a.answer, (counts.get(a.answer) ?? 0) + 1);
    return counts;
  }, [answers]);

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) m.set(p.userId, pName(p.user));
    return m;
  }, [participants]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-ink-700 p-5 ring-1 ring-white/10 animate-fade-up sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">🎲 Mini-Games</h2>
          <button className="text-white/40" onClick={onClose}>
            ✕
          </button>
        </div>

        {currentQuestion && currentGameType && (
          <div className="card mb-4 space-y-3 border border-grape-500/30 bg-grape-500/10">
            <p className="text-xs uppercase tracking-wide text-grape-400">
              {GAME_LABELS[currentGameType].emoji} {GAME_LABELS[currentGameType].label}
            </p>
            <p className="text-lg font-semibold">{currentQuestion}</p>

            {/* Interactive answer area */}
            {currentGameType === 'most_likely' && (
              <div className="space-y-2">
                <p className="text-sm text-white/60">Tap who fits best:</p>
                <div className="grid grid-cols-2 gap-2">
                  {participants.map((p) => (
                    <button
                      key={p.id}
                      className="chip flex items-center justify-between bg-white/5 py-2"
                      disabled={busy}
                      onClick={() => submit(p.userId)}
                    >
                      <span className="truncate">{pName(p.user)}</span>
                      {voteTally.get(p.userId) ? (
                        <span className="ml-1 rounded-full bg-grape-500 px-2 text-xs">
                          {voteTally.get(p.userId)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentGameType === 'truth_or_story' && (
              <div className="space-y-2">
                <textarea
                  className="input min-h-[64px] resize-none"
                  placeholder="Share your answer (everyone will see it)…"
                  maxLength={200}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                />
                <button className="btn-secondary w-full" disabled={busy} onClick={() => submit(storyText)}>
                  Share my answer
                </button>
              </div>
            )}

            {currentGameType === 'toast_card' && (
              <button
                className="btn-primary w-full"
                disabled={busy || answered}
                onClick={() => submit('🥂 read it aloud')}
              >
                {answered ? '✓ Read aloud' : '🥂 I read it aloud!'}
              </button>
            )}

            {/* Live results shared with the whole room */}
            {answers.length > 0 && (
              <div className="space-y-1 rounded-2xl bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Live answers · {answers.length}
                </p>
                {answers.map((a) => (
                  <p key={a.userId} className="text-sm">
                    <span className="font-semibold text-gold-400">{a.name}:</span>{' '}
                    {currentGameType === 'most_likely'
                      ? `voted ${idToName.get(a.answer) ?? 'someone'}`
                      : a.answer}
                  </p>
                ))}
              </div>
            )}

            <button className="btn-ghost w-full" disabled={busy} onClick={next}>
              Next question →
            </button>
          </div>
        )}

        <p className="mb-2 text-sm text-white/50">
          {currentQuestion ? 'Or start another game:' : 'Pick a game to play together:'}
        </p>
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
        {gameId && <p className="mt-2 text-center text-[10px] text-white/20">game {gameId.slice(-6)}</p>}
      </div>
    </div>
  );
}
