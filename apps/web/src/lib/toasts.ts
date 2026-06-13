import type { ToastMood } from '@toastup/shared';

// Local preview generator (mirrors the server's aiToastService templates).
const TEMPLATES: Record<ToastMood, string[]> = {
  funny: [
    'To Wi-Fi strong enough to hold this table together — and to friends even stronger!',
    'To us: the only party where nobody has to find parking.',
  ],
  heartfelt: [
    'To the people who stay close, even when they are far away.',
    'May this evening be light, the conversations honest, and the mood warm.',
  ],
  short: ['To us. To now. To good company.', 'Here is to warm evenings.'],
  romantic: [
    'To the look across the table that says everything words cannot.',
    'To evenings that feel like home because you are in them.',
  ],
  for_friends: [
    'To friends who appear at the right moment, even if only through Telegram.',
    'To the chosen family that picks up the call no matter the hour.',
  ],
  birthday: [
    'To another trip around the sun — may it be your warmest one yet!',
    'To the birthday star: more laughter, more light, more you.',
  ],
};

export function generateToastLocal(mood: ToastMood): string {
  const pool = TEMPLATES[mood] ?? TEMPLATES.heartfelt;
  return pool[Math.floor(Math.random() * pool.length)];
}
