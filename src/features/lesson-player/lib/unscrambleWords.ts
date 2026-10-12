export type UnscrambleToken = {
  id: string;
  value: string;
};

export type UnscrambleSentence = {
  id: string;
  /** Author input, e.g. "She / is / a / teacher." */
  raw: string;
  tokens: UnscrambleToken[];
};

export type UnscrambleWordsData = {
  id?: number;
  sortIndex?: number;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  images?: Array<Record<string, string>>;
  sentences: UnscrambleSentence[];
};

/** Split on `/`, trim, drop empties. */
export function parseUnscrambleTokenValues(raw: string): string[] {
  return String(raw || '')
    .split('/')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/** At least one `/` and ≥2 non-empty tokens. */
export function isUnscrambleSentenceValid(raw: string): boolean {
  if (!String(raw || '').includes('/')) {
    return false;
  }
  return parseUnscrambleTokenValues(raw).length >= 2;
}

/** Exact match (case-sensitive); only trims edges. */
export function normalizeUnscrambleToken(s: string): string {
  return String(s || '').trim();
}

export function slotAnswerKey(sentenceId: string, slotIndex: number) {
  return `${sentenceId}:${slotIndex}`;
}

export function parseSlotAnswerKey(key: string): {
  sentenceId: string;
  slotIndex: number;
} {
  const i = String(key).lastIndexOf(':');
  if (i > 0 && /^\d+$/.test(String(key).slice(i + 1))) {
    return {
      sentenceId: String(key).slice(0, i),
      slotIndex: Number(key.slice(i + 1)),
    };
  }
  return {sentenceId: String(key), slotIndex: 0};
}

/** Fisher–Yates shuffle copy. */
export function shuffleItems<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = copy[i];
    copy[i] = copy[j];
    copy[j] = t;
  }
  return copy;
}
