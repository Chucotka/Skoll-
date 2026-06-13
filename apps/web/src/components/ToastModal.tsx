import { useState } from 'react';
import { MAX_TOAST_LENGTH, TOAST_MOODS, type ToastMood } from '@toastup/shared';
import { generateToastLocal } from '../lib/toasts';
import { haptic } from '../lib/telegram';

interface Props {
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

export default function ToastModal({ onClose, onSend }: Props) {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<ToastMood>('heartfelt');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    haptic();
    setText(generateToastLocal(mood));
  }

  async function send() {
    if (!text.trim()) {
      setError('Write or generate a toast first.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send toast');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-ink-700 p-5 ring-1 ring-white/10 animate-fade-up sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">🥂 Raise a Toast</h2>
          <button className="text-white/40" onClick={onClose}>
            ✕
          </button>
        </div>

        <textarea
          className="input min-h-[96px] resize-none"
          placeholder="Say a few warm words…"
          maxLength={MAX_TOAST_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-white/30">
          {text.length}/{MAX_TOAST_LENGTH}
        </p>

        <div className="mt-2">
          <p className="mb-2 text-sm text-white/60">Mood</p>
          <div className="flex flex-wrap gap-2">
            {TOAST_MOODS.map((m) => (
              <button
                key={m.id}
                className={`chip ${
                  mood === m.id ? 'bg-grape-500 text-white' : 'bg-white/5 text-white/70'
                }`}
                onClick={() => setMood(m.id)}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-4 space-y-2">
          <button className="btn-ghost w-full" onClick={generate}>
            ✨ Generate Toast
          </button>
          <button className="btn-primary w-full" disabled={sending} onClick={send}>
            {sending ? 'Sending…' : 'Send Toast to Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
