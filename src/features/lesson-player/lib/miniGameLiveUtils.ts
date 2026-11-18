/** Deterministic Fisher–Yates so every client shares the same layout. */
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed >>> 0 || 1;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function newClientEventId() {
  return `mg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
