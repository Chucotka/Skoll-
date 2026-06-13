import { MAX_TOAST_LENGTH } from '@toastup/shared';

// Minimal blocked-words list for the MVP. Extend or move to DB/config later.
const BLOCKED_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'nigger',
  'faggot',
  'cunt',
];

const blockedRegexes = BLOCKED_WORDS.map(
  (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
);

export interface FilterResult {
  ok: boolean;
  cleaned: string;
  reason?: string;
}

/** Validate length and mask blocked words. Rejects empty / overly long content. */
export function filterText(input: string, maxLength = MAX_TOAST_LENGTH): FilterResult {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    return { ok: false, cleaned: '', reason: 'Message cannot be empty.' };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, cleaned: trimmed, reason: `Message is too long (max ${maxLength}).` };
  }

  let cleaned = trimmed;
  for (const re of blockedRegexes) {
    cleaned = cleaned.replace(re, (m) => '*'.repeat(m.length));
  }
  return { ok: true, cleaned };
}
