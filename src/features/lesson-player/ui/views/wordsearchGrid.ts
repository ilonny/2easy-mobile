export type WordPlacement = {
  word: string;
  cells: Array<{row: number; col: number}>;
};

export type WordsearchGrid = {
  size: number;
  grid: string[][];
  placements: WordPlacement[];
};

/** Only forward horizontal / vertical — no reverse, no diagonals. */
const DIRS: Array<[number, number]> = [
  [0, 1], // right
  [1, 0], // down
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeWord(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9]/gi, '');
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG so every client builds the same grid for the same words. */
function createRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) {
      return false;
    }
    const cell = grid[r][c];
    if (cell && cell !== word[i]) {
      return false;
    }
  }
  return true;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): Array<{row: number; col: number}> {
  const cells: Array<{row: number; col: number}> = [];
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    grid[r][c] = word[i];
    cells.push({row: r, col: c});
  }
  return cells;
}

export function buildWordsearchGrid(rawWords: string[]): WordsearchGrid {
  const words = Array.from(
    new Set(
      rawWords
        .map(normalizeWord)
        .filter(w => w.length >= 2)
        .slice(0, 12),
    ),
  ).sort((a, b) => b.length - a.length);

  const longest = words.reduce((m, w) => Math.max(m, w.length), 4);
  const size = Math.min(
    16,
    Math.max(
      8,
      longest + 2,
      Math.ceil(Math.sqrt(words.join('').length * 2)) + 2,
    ),
  );

  const rng = createRng(hashSeed(words.join('|') + `:${size}`));

  const grid: (string | null)[][] = Array.from({length: size}, () =>
    Array.from({length: size}, () => null),
  );
  const placements: WordPlacement[] = [];

  const positionPool: Array<{row: number; col: number; dir: number}> = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (let dir = 0; dir < DIRS.length; dir++) {
        positionPool.push({row, col, dir});
      }
    }
  }

  for (const word of words) {
    const candidates = shuffleWithRng(positionPool, rng);
    let placed = false;
    for (const {row, col, dir} of candidates) {
      const [dr, dc] = DIRS[dir];
      if (!canPlace(grid, word, row, col, dr, dc)) {
        continue;
      }
      const cells = placeWord(grid, word, row, col, dr, dc);
      placements.push({word, cells});
      placed = true;
      break;
    }
    if (!placed) {
      // Extremely rare; leave word out rather than force a reverse direction.
    }
  }

  const filled: string[][] = grid.map(row =>
    row.map(cell => cell || LETTERS[Math.floor(rng() * 26)]),
  );

  return {size, grid: filled, placements};
}

export function cellsKey(cells: Array<{row: number; col: number}>): string {
  return cells.map(c => `${c.row},${c.col}`).join('|');
}
