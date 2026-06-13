import type { GameType } from '@toastup/shared';

/**
 * Safe, friendly mini-game content. Nothing here pressures anyone to drink —
 * these are conversation prompts for an online social table.
 */

const MOST_LIKELY = [
  'Who is most likely to be late to a meeting?',
  'Who is most likely to become the star of the evening?',
  'Who is most likely to forget why they entered the room?',
  'Who is most likely to start a spontaneous dance?',
  'Who is most likely to know a fun fact about anything?',
  'Who is most likely to plan the next get-together?',
];

const TRUTH_OR_STORY = [
  'Tell the funniest thing that happened to you this week.',
  'What movie would you rewatch right now?',
  'What advice would you give yourself 5 years ago?',
  'What is a small thing that always makes your day better?',
  'What hobby would you try if you had unlimited free time?',
  'Share a tiny win you had recently.',
];

const TOAST_CARD = [
  'A toast to friendship.',
  'A toast to luck.',
  'A toast to a new project.',
  'A toast to love.',
  'A toast to people who are far away.',
  'A toast to new beginnings.',
];

const POOLS: Record<GameType, string[]> = {
  most_likely: MOST_LIKELY,
  truth_or_story: TRUTH_OR_STORY,
  toast_card: TOAST_CARD,
};

export function isGameType(value: string): value is GameType {
  return value === 'most_likely' || value === 'truth_or_story' || value === 'toast_card';
}

export function getRandomQuestion(gameType: GameType, exclude?: string | null): string {
  const pool = POOLS[gameType];
  const candidates = exclude ? pool.filter((q) => q !== exclude) : pool;
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}
