export const MINI_GAME_KINDS = [
  'flash-cards',
  'matching-pairs',
  'spin-wheel',
  'hangman',
  'wordsearch',
] as const;

export type MiniGameKind = (typeof MINI_GAME_KINDS)[number];

export const MINI_GAME_EX_TYPE = 'mini_game';

export type MiniGameItem = {
  id: string;
  term: string;
  definition?: string;
};

export type MiniGameData = {
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  images?: unknown[];
  activeGame: MiniGameKind;
  items: MiniGameItem[];
  options?: {
    showDefinitionOnWheel?: boolean;
    shuffle?: boolean;
    /** Flash cards: one at a time (default) or all on screen */
    flashCardsLayout?: 'one' | 'all';
  };
};

export type MiniGameDragCell = {row: number; col: number};

/** Shared live snapshot (also used as local/answer-shaped progress). */
export type MiniGameAnswerState = {
  activeGame?: MiniGameKind;
  score?: number;
  total?: number;
  completed?: boolean;
  knownIds?: string[];
  matchedPairIds?: string[];
  lastSpinItemId?: string | null;
  hangman?: {
    wordIndex: number;
    /** Revealed letter positions (one index per successful guess). */
    revealedIndexes?: number[];
    /** Letters guessed that were not in the remaining unrevealed slots. */
    missedLetters?: string[];
    /** @deprecated legacy — all instances of a letter revealed at once */
    guessed?: string[];
    wrong: number;
    status: 'playing' | 'won' | 'lost';
  };
  foundWords?: string[];
  /** Live UI — flash / matching layout */
  layoutSeed?: number;
  order?: string[];
  flipped?: boolean;
  flippedIds?: string[];
  cardIndex?: number;
  openIds?: string[];
  tileOrder?: string[];
  /** Live UI — wheel spin in flight */
  spinTargetId?: string | null;
  spinStartedAtMs?: number | null;
  spinDurationMs?: number;
  spinToken?: number;
  /** Live UI — wordsearch drag */
  drag?: {start: MiniGameDragCell; hover: MiniGameDragCell} | null;
};

export type MiniGameLiveState = MiniGameAnswerState;

export const MINI_GAME_META: Array<{
  id: MiniGameKind;
  titleKey: string;
  titleDefault: string;
}> = [
  {
    id: 'flash-cards',
    titleKey: 'templates.miniGameFlashCards',
    titleDefault: 'Flash cards',
  },
  {
    id: 'matching-pairs',
    titleKey: 'templates.miniGameMatchingPairs',
    titleDefault: 'Matching pairs',
  },
  {
    id: 'spin-wheel',
    titleKey: 'templates.miniGameSpinWheel',
    titleDefault: 'Spin the wheel',
  },
  {
    id: 'hangman',
    titleKey: 'templates.miniGameHangman',
    titleDefault: 'Hangman',
  },
  {
    id: 'wordsearch',
    titleKey: 'templates.miniGameWordsearch',
    titleDefault: 'Wordsearch',
  },
];

export function isMiniGameKind(value: unknown): value is MiniGameKind {
  return (
    typeof value === 'string' &&
    (MINI_GAME_KINDS as readonly string[]).includes(value)
  );
}

export function resolveActiveGame(
  templateType?: string | null,
  data?: Partial<MiniGameData> | null,
): MiniGameKind {
  if (isMiniGameKind(templateType)) {
    return templateType;
  }
  if (isMiniGameKind(data?.activeGame)) {
    return data.activeGame;
  }
  return 'flash-cards';
}

export function isMiniGameItemValid(item: {
  term?: string;
  definition?: string;
}): boolean {
  return (
    !!String(item?.term || '').trim() ||
    !!String(item?.definition || '').trim()
  );
}

export function minItemsForGame(game: MiniGameKind): number {
  switch (game) {
    case 'matching-pairs':
    case 'wordsearch':
      return 4;
    default:
      return 1;
  }
}

export function validItems(
  items: MiniGameItem[] | undefined,
  opts?: {keepEmpty?: boolean},
): MiniGameItem[] {
  const normalized = (items || []).map(i => ({
    id: i.id,
    term: String(i.term || '').trim(),
    definition: String(i.definition || '').trim() || undefined,
  }));
  if (opts?.keepEmpty) {
    return normalized;
  }
  return normalized.filter(isMiniGameItemValid);
}

export function itemWord(item: MiniGameItem): string {
  return String(item.term || '').trim() || String(item.definition || '').trim();
}
