import type { ToastMood } from '@toastup/shared';

/**
 * AI Host toast generator.
 *
 * For the MVP this uses local, hand-written templates. The architecture is kept
 * provider-agnostic: swap `generateToastPrompt` for a call to OpenAI / another
 * provider later without touching callers.
 */

export interface GenerateToastOptions {
  mood?: ToastMood;
  occasion?: string | null;
}

const TEMPLATES: Record<ToastMood, string[]> = {
  funny: [
    'To Wi-Fi strong enough to hold this table together — and to friends even stronger!',
    'To us: the only party where nobody has to find parking.',
    'To laughing so hard the neighbors think we are up to something.',
  ],
  heartfelt: [
    'To the people who stay close, even when they are far away.',
    'May this evening be light, the conversations honest, and the mood warm.',
    'To small moments that quietly become the best memories.',
  ],
  short: [
    'To us. To now. To good company.',
    'Here is to warm evenings.',
    'To friendship, simply.',
  ],
  romantic: [
    'To the look across the table that says everything words cannot.',
    'To evenings that feel like home because you are in them.',
    'To love that grows softer and brighter with every shared moment.',
  ],
  for_friends: [
    'To friends who appear at the right moment, even if only through Telegram.',
    'To the chosen family that picks up the call no matter the hour.',
    'To friendships measured not in distance, but in showing up.',
  ],
  birthday: [
    'To another trip around the sun — may it be your warmest one yet!',
    'To the birthday star: more laughter, more light, more you.',
    'To a new year full of kind people and good stories.',
  ],
};

const FALLBACK = [
  'To good company and an easy evening together.',
  'To honest talks, warm laughter, and time well spent.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateToastPrompt(
  mood?: ToastMood,
  occasion?: string | null,
): string {
  const pool = (mood && TEMPLATES[mood]) || FALLBACK;
  let toast = pick(pool);

  if (occasion && occasion.trim()) {
    const occasionLabel = occasion.trim().replace(/_/g, ' ');
    // Lightly weave the occasion in without overwriting the crafted line.
    toast = `${toast} (For tonight: ${occasionLabel}.)`;
  }
  return toast;
}

export async function generateToast(opts: GenerateToastOptions = {}): Promise<string> {
  // Async by design so a future network-backed provider is a drop-in replacement.
  return generateToastPrompt(opts.mood, opts.occasion ?? null);
}
