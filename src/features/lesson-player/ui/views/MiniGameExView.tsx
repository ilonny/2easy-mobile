import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLayout} from '../../../../shared/lib/layout';
import {
  itemWord,
  validItems,
  type MiniGameAnswerState,
  type MiniGameItem,
  type MiniGameKind,
} from '../../../lesson-editor/ui/editors/miniGameTypes';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {useMiniGameLiveSync} from '../../model/useMiniGameLiveSync';
import {
  hashSeed,
  shuffleWithSeed,
} from '../../lib/miniGameLiveUtils';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {buildWordsearchGrid, cellsKey} from './wordsearchGrid';

type Props = {data: any};

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_WRONG = 6;
const WHEEL_SPIN_MS = 900;
const WHEEL_COLORS = [
  '#FDE68A',
  '#BBF7D0',
  '#BFDBFE',
  '#FBCFE8',
  '#DDD6FE',
  '#FECACA',
];

function normalizeHangman(s: string) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9 ]/gi, '');
}

type Cell = {row: number; col: number};

function lineBetween(a: Cell, b: Cell): Cell[] | null {
  const dr = Math.sign(b.row - a.row);
  const dc = Math.sign(b.col - a.col);
  const rowDist = Math.abs(b.row - a.row);
  const colDist = Math.abs(b.col - a.col);
  if (rowDist !== 0 && colDist !== 0 && rowDist !== colDist) {
    return null;
  }
  const steps = Math.max(rowDist, colDist);
  const cells: Cell[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({row: a.row + dr * i, col: a.col + dc * i});
  }
  return cells;
}

export function MiniGameExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {isTablet} = useLayout();
  const {width} = useWindowDimensions();
  const exId = Number(data?.id || 0);
  const liveEnabled =
    Number.isFinite(lessonId) && lessonId > 0 && Number.isFinite(exId) && exId > 0;

  const live = useMiniGameLiveSync({
    lessonId: Number(lessonId || 0),
    exId,
    enabled: liveEnabled,
    role: isTeacher ? 'teacher' : 'student',
  });

  const {writeAnswer, answers, resetSeq} = useExAnswer({
    lessonId,
    exId,
    studentId,
    activeStudentId,
    isTeacher,
  });

  const activeGame: MiniGameKind = data?.activeGame || 'flash-cards';
  const items = useMemo(
    () =>
      validItems(data?.items as MiniGameItem[], {
        keepEmpty: activeGame === 'flash-cards',
      }),
    [data?.items, activeGame],
  );
  const shuffle = data?.options?.shuffle !== false;
  const showDefinitionOnWheel = !!data?.options?.showDefinitionOnWheel;
  const flashCardsLayout =
    data?.options?.flashCardsLayout === 'all' ? 'all' : 'one';

  const [localState, setLocalState] = useState<MiniGameAnswerState>({});
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<string | null>(null);
  const writeAnswerRef = useRef(writeAnswer);
  writeAnswerRef.current = writeAnswer;

  // Live mode: anyone can interact; answers are not persisted.
  const answerTargetId = isTeacher ? activeStudentId : studentId;
  const canInteract = liveEnabled ? true : !!answerTargetId;
  const shouldPersist = liveEnabled ? false : !!answerTargetId;
  const state = liveEnabled ? live.state : localState;

  useEffect(() => {
    if (liveEnabled) {
      return;
    }
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    pendingPersistRef.current = null;
    setLocalState({});
  }, [resetSeq, liveEnabled]);

  useEffect(() => {
    if (liveEnabled) {
      return;
    }
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    pendingPersistRef.current = null;
    setLocalState({});
  }, [activeStudentId, liveEnabled]);

  useEffect(() => {
    if (liveEnabled) {
      return;
    }
    try {
      const raw =
        answers[String(data?.id)]?.answer ??
        answers[Number(data?.id) as unknown as string]?.answer;
      if (!raw) {
        setLocalState({});
        return;
      }
      const parsed = JSON.parse(raw);
      setLocalState(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      // ignore
    }
  }, [answers, data?.id, activeStudentId, liveEnabled]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      const payload = pendingPersistRef.current;
      pendingPersistRef.current = null;
      if (payload != null && shouldPersist) {
        void writeAnswerRef.current(data.id, payload);
      }
    };
  }, [data.id, shouldPersist]);

  const persist = useCallback(
    (next: MiniGameAnswerState) => {
      if (!shouldPersist) {
        return;
      }
      const payload = JSON.stringify(next);
      pendingPersistRef.current = payload;
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        pendingPersistRef.current = null;
        void writeAnswerRef.current(data.id, payload);
      }, 400);
    },
    [data.id, shouldPersist],
  );

  const patch = useCallback(
    (partial: Partial<MiniGameAnswerState>) => {
      if (!canInteract) {
        return;
      }
      if (liveEnabled) {
        live.patchState(partial);
        return;
      }
      setLocalState(prev => {
        const next = {...prev, ...partial};
        persist(next);
        return next;
      });
    },
    [canInteract, live, liveEnabled, persist],
  );

  const images = data?.images?.length ? [data.images[0]] : [];

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!images.length && <ImageGallery images={images} />}
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        {activeGame === 'flash-cards' && (
          <FlashCards
            items={items}
            shuffle={shuffle}
            layout={flashCardsLayout}
            canInteract={canInteract}
            state={state}
            onPatch={patch}
          />
        )}
        {activeGame === 'matching-pairs' && (
          <MatchingPairs
            items={items}
            shuffle={shuffle}
            canInteract={canInteract}
            state={state}
            onPatch={patch}
          />
        )}
        {activeGame === 'spin-wheel' && (
          <SpinWheel
            items={items}
            showDefinition={showDefinitionOnWheel}
            canInteract={canInteract}
            state={state}
            onPatch={patch}
          />
        )}
        {activeGame === 'hangman' && (
          <Hangman
            items={items}
            canInteract={canInteract}
            state={state}
            onPatch={patch}
          />
        )}
        {activeGame === 'wordsearch' && (
          <WordSearchGame
            items={items}
            canInteract={canInteract}
            state={state}
            onPatch={patch}
            screenWidth={width}
            isTablet={isTablet}
          />
        )}
      </View>
    </View>
  );
}

function FlashCards({
  items,
  shuffle,
  layout = 'one',
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  shuffle: boolean;
  layout?: 'one' | 'all';
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  if (layout === 'all') {
    return (
      <FlashCardsAll
        items={items}
        shuffle={shuffle}
        canInteract={canInteract}
        state={state}
        onPatch={onPatch}
      />
    );
  }
  return (
    <FlashCardsOne
      items={items}
      shuffle={shuffle}
      canInteract={canInteract}
      state={state}
      onPatch={onPatch}
    />
  );
}

function useSharedCardOrder(
  items: MiniGameItem[],
  shuffle: boolean,
  state: MiniGameAnswerState,
  onPatch: (p: Partial<MiniGameAnswerState>) => void,
  canInteract: boolean,
) {
  const ids = useMemo(() => items.map(i => i.id), [items]);
  const defaultSeed = useMemo(() => hashSeed(ids.join('|')), [ids]);
  const order = useMemo(() => {
    if (state.order?.length) {
      return state.order;
    }
    const seed = state.layoutSeed ?? defaultSeed;
    return shuffle ? shuffleWithSeed(ids, seed) : ids;
  }, [defaultSeed, ids, shuffle, state.layoutSeed, state.order]);

  useEffect(() => {
    if (!canInteract || !items.length) {
      return;
    }
    if (state.order?.length && state.layoutSeed != null) {
      return;
    }
    onPatch({
      layoutSeed: state.layoutSeed ?? defaultSeed,
      order,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInteract, defaultSeed, items.length]);

  return order;
}

function FlashCardsOne({
  items,
  shuffle,
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  shuffle: boolean;
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  const order = useSharedCardOrder(items, shuffle, state, onPatch, canInteract);
  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const known = new Set(state.knownIds || []);
  const remaining = order.filter(id => !known.has(id));
  const index = Math.min(
    Math.max(0, state.cardIndex || 0),
    Math.max(0, remaining.length - 1),
  );
  const currentId = remaining[index];
  const current = currentId ? byId.get(currentId) : undefined;
  const flipped = !!state.flipped;

  const restartAll = () => {
    if (!canInteract) {
      return;
    }
    const seed = (state.layoutSeed || 0) + 1;
    onPatch({
      activeGame: 'flash-cards',
      knownIds: [],
      score: 0,
      total: items.length,
      completed: false,
      flipped: false,
      cardIndex: 0,
      layoutSeed: seed,
      order: shuffle
        ? shuffleWithSeed(
            items.map(i => i.id),
            seed,
          )
        : items.map(i => i.id),
    });
  };

  if (!remaining.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.score}>
          Done: {items.length}/{items.length}
        </Text>
        <Text style={styles.big}>Все карточки пройдены</Text>
        {canInteract ? (
          <Pressable style={styles.primaryBtn} onPress={restartAll}>
            <Text style={styles.primaryBtnText}>Начать заново</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.score}>
        Known: {known.size}/{items.length}
      </Text>
      <Pressable
        style={styles.flashCard}
        disabled={!canInteract}
        onPress={() => canInteract && onPatch({flipped: !flipped})}>
        <Text style={styles.big}>
          {flipped
            ? String(current?.definition || '') || ' '
            : String(current?.term || '') || ' '}
        </Text>
        <Text style={styles.hint}>Нажмите, чтобы перевернуть</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={() => {
            if (!canInteract) {
              return;
            }
            onPatch({
              flipped: false,
              cardIndex: remaining.length ? (index + 1) % remaining.length : 0,
            });
          }}>
          <Text style={styles.secondaryBtnText}>Again</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          disabled={!canInteract || !current}
          onPress={() => {
            if (!canInteract || !current) {
              return;
            }
            const nextKnown = Array.from(
              new Set([...(state.knownIds || []), current.id]),
            );
            onPatch({
              activeGame: 'flash-cards',
              knownIds: nextKnown,
              score: nextKnown.length,
              total: items.length,
              completed: nextKnown.length >= items.length,
              flipped: false,
              cardIndex: 0,
            });
          }}>
          <Text style={styles.primaryBtnText}>Next</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={restartAll}>
          <Text style={styles.secondaryBtnText}>Начать заново</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FlashCardsAll({
  items,
  shuffle,
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  shuffle: boolean;
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  const order = useSharedCardOrder(items, shuffle, state, onPatch, canInteract);
  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const flippedIds = new Set(state.flippedIds || []);

  const restartAll = () => {
    if (!canInteract) {
      return;
    }
    const seed = (state.layoutSeed || 0) + 1;
    onPatch({
      activeGame: 'flash-cards',
      knownIds: [],
      flippedIds: [],
      score: 0,
      total: items.length,
      completed: false,
      layoutSeed: seed,
      order: shuffle
        ? shuffleWithSeed(
            items.map(i => i.id),
            seed,
          )
        : items.map(i => i.id),
    });
  };

  return (
    <View style={styles.center}>
      <Text style={styles.score}>Cards: {items.length}</Text>
      <View style={styles.flashAllGrid}>
        {order.map(id => {
          const item = byId.get(id);
          if (!item) {
            return null;
          }
          const flipped = flippedIds.has(id);
          return (
            <Pressable
              key={id}
              style={[styles.flashAllCard, flipped && styles.flashAllCardBack]}
              disabled={!canInteract}
              onPress={() => {
                if (!canInteract) {
                  return;
                }
                const next = new Set(flippedIds);
                if (next.has(id)) {
                  next.delete(id);
                } else {
                  next.add(id);
                }
                const viewed = Array.from(
                  new Set([...(state.knownIds || []), id]),
                );
                onPatch({
                  activeGame: 'flash-cards',
                  flippedIds: Array.from(next),
                  knownIds: viewed,
                  score: viewed.length,
                  total: items.length,
                  completed: viewed.length >= items.length,
                });
              }}>
              <Text style={styles.flashAllText}>
                {flipped
                  ? String(item.definition || '') || ' '
                  : String(item.term || '') || ' '}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {canInteract ? (
        <Pressable style={styles.secondaryBtn} onPress={restartAll}>
          <Text style={styles.secondaryBtnText}>Начать заново</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MatchingPairs({
  items,
  shuffle,
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  shuffle: boolean;
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseTiles = useMemo(
    () =>
      items.flatMap(item => [
        {id: `${item.id}:term`, pairId: item.id, text: item.term},
        {
          id: `${item.id}:def`,
          pairId: item.id,
          text: item.definition || item.term,
        },
      ]),
    [items],
  );
  const defaultSeed = useMemo(
    () => hashSeed(baseTiles.map(t => t.id).join('|')),
    [baseTiles],
  );
  const tiles = useMemo(() => {
    if (state.tileOrder?.length) {
      const byId = new Map(baseTiles.map(t => [t.id, t]));
      return state.tileOrder
        .map(id => byId.get(id))
        .filter(Boolean) as typeof baseTiles;
    }
    const seed = state.layoutSeed ?? defaultSeed;
    return shuffle ? shuffleWithSeed(baseTiles, seed) : baseTiles;
  }, [baseTiles, defaultSeed, shuffle, state.layoutSeed, state.tileOrder]);

  useEffect(() => {
    if (!baseTiles.length) {
      return;
    }
    if (state.tileOrder?.length && state.layoutSeed != null) {
      return;
    }
    const seed = state.layoutSeed ?? defaultSeed;
    const ordered = shuffle ? shuffleWithSeed(baseTiles, seed) : baseTiles;
    onPatch({
      layoutSeed: seed,
      tileOrder: ordered.map(t => t.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSeed, baseTiles.length]);

  const matched = new Set(state.matchedPairIds || []);
  const openIds = state.openIds || [];
  const locked = openIds.length >= 2;

  // Every client resolves a two-card open locally so remotes don't stay stuck.
  useEffect(() => {
    if (openIds.length < 2) {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
      return;
    }
    const [aId, bId] = openIds;
    const a = tiles.find(t => t.id === aId);
    const b = tiles.find(t => t.id === bId);
    const matchedSnapshot = state.matchedPairIds || [];
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
    }
    resolveTimerRef.current = setTimeout(() => {
      resolveTimerRef.current = null;
      if (a && b && a.pairId === b.pairId && a.id !== b.id) {
        const nextMatched = Array.from(
          new Set([...matchedSnapshot, a.pairId]),
        );
        onPatch({
          activeGame: 'matching-pairs',
          matchedPairIds: nextMatched,
          openIds: [],
          score: nextMatched.length,
          total: items.length,
          completed: nextMatched.length >= items.length,
        });
      } else {
        onPatch({
          activeGame: 'matching-pairs',
          openIds: [],
        });
      }
    }, 550);
    return () => {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds.join('|'), tiles]);

  const onTile = (tile: {id: string; pairId: string; text: string}) => {
    if (!canInteract || locked || matched.has(tile.pairId)) {
      return;
    }
    if (openIds.includes(tile.id)) {
      return;
    }
    onPatch({
      activeGame: 'matching-pairs',
      openIds: [...openIds, tile.id],
    });
  };

  return (
    <View>
      <Text style={styles.score}>
        Pairs: {matched.size}/{items.length}
      </Text>
      <View style={styles.memoryGrid}>
        {tiles.map(tile => {
          const isMatched = matched.has(tile.pairId);
          const isOpen = isMatched || openIds.includes(tile.id);
          return (
            <Pressable
              key={tile.id}
              disabled={!canInteract || isMatched}
              style={[
                styles.memoryTile,
                isMatched && styles.memoryMatched,
                isOpen && !isMatched && styles.memoryOpen,
              ]}
              onPress={() => onTile(tile)}>
              <Text
                style={[
                  styles.memoryText,
                  (isOpen || isMatched) && styles.memoryTextOpen,
                ]}>
                {isOpen ? tile.text : '?'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SpinWheel({
  items,
  showDefinition,
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  showDefinition: boolean;
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  const labels = items.map(i => ({
    id: i.id,
    text: showDefinition && i.definition ? i.definition : i.term,
  }));
  const targetId = state.spinTargetId || state.lastSpinItemId || null;
  const result = labels.find(l => l.id === targetId);
  const spinStartedAt = state.spinStartedAtMs || null;
  const spinDuration = state.spinDurationMs || WHEEL_SPIN_MS;
  const [spinning, setSpinning] = useState(false);
  const lastAnimKeyRef = useRef('');

  useEffect(() => {
    if (!spinStartedAt || !targetId) {
      setSpinning(false);
      return;
    }
    const key = `${targetId}|${state.spinToken || 0}|${spinStartedAt}`;
    if (lastAnimKeyRef.current === key) {
      return;
    }
    lastAnimKeyRef.current = key;
    const elapsed = Math.max(0, Date.now() - spinStartedAt);
    if (elapsed >= spinDuration) {
      setSpinning(false);
      return;
    }
    setSpinning(true);
    const left = spinDuration - elapsed;
    const t = setTimeout(() => setSpinning(false), left);
    return () => clearTimeout(t);
  }, [spinDuration, spinStartedAt, state.spinToken, targetId]);

  const spin = () => {
    if (!canInteract || spinning || !labels.length) {
      return;
    }
    const index = Math.floor(Math.random() * labels.length);
    onPatch({
      activeGame: 'spin-wheel',
      spinTargetId: labels[index].id,
      lastSpinItemId: labels[index].id,
      spinStartedAtMs: Date.now(),
      spinDurationMs: WHEEL_SPIN_MS,
      spinToken: (state.spinToken || 0) + 1,
      score: (state.score || 0) + 1,
      total: labels.length,
    });
  };

  return (
    <View style={styles.center}>
      <View style={styles.wheelList}>
        {labels.map((l, i) => (
          <View
            key={l.id}
            style={[
              styles.wheelSeg,
              {backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length]},
              result?.id === l.id && styles.wheelSegActive,
            ]}>
            <Text style={styles.wheelSegText} numberOfLines={1}>
              {l.text}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.big}>{spinning ? '…' : result?.text || ' '}</Text>
      <Pressable
        style={styles.primaryBtn}
        disabled={!canInteract || spinning}
        onPress={spin}>
        <Text style={styles.primaryBtnText}>
          {spinning ? '...' : 'Spin'}
        </Text>
      </Pressable>
    </View>
  );
}

function emptyHangmanState(wordIndex: number) {
  return {
    wordIndex,
    revealedIndexes: [] as number[],
    missedLetters: [] as string[],
    guessed: [] as string[],
    wrong: 0,
    status: 'playing' as const,
  };
}

function resolveHangmanRevealed(
  word: string,
  hangman: MiniGameAnswerState['hangman'] | undefined,
): number[] {
  if (Array.isArray(hangman?.revealedIndexes)) {
    return hangman!.revealedIndexes!;
  }
  const guessed = new Set(
    (hangman?.guessed || []).map(g => g.toUpperCase()),
  );
  if (!guessed.size) {
    return [];
  }
  const out: number[] = [];
  word.split('').forEach((ch, idx) => {
    if (ch !== ' ' && guessed.has(ch)) {
      out.push(idx);
    }
  });
  return out;
}

function Hangman({
  items,
  canInteract,
  state,
  onPatch,
}: {
  items: MiniGameItem[];
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
}) {
  const wordIndex = Math.min(
    Math.max(0, state.hangman?.wordIndex ?? 0),
    Math.max(0, items.length - 1),
  );
  const item = items[wordIndex];
  const word = normalizeHangman(item ? itemWord(item) : '');
  const revealed = useMemo(
    () => new Set(resolveHangmanRevealed(word, state.hangman)),
    [word, state.hangman],
  );
  const missed = useMemo(() => {
    const set = new Set(
      (state.hangman?.missedLetters || []).map(g => g.toUpperCase()),
    );
    if (!state.hangman?.missedLetters?.length && state.hangman?.guessed?.length) {
      (state.hangman.guessed || []).forEach(g => {
        const L = g.toUpperCase();
        if (!word.includes(L)) {
          set.add(L);
        }
      });
    }
    return set;
  }, [state.hangman, word]);
  const wrong = state.hangman?.wrong ?? missed.size;
  const status = state.hangman?.status ?? 'playing';

  const playableIndexes = useMemo(() => {
    const idxs: number[] = [];
    word.split('').forEach((ch, idx) => {
      if (ch !== ' ') {
        idxs.push(idx);
      }
    });
    return idxs;
  }, [word]);

  const remainingCount = (letter: string) => {
    const L = letter.toUpperCase();
    let left = 0;
    word.split('').forEach((ch, idx) => {
      if (ch === L && !revealed.has(idx)) {
        left += 1;
      }
    });
    return left;
  };

  const letterExhausted = (letter: string) => {
    const L = letter.toUpperCase();
    if (missed.has(L)) {
      return true;
    }
    const total = word.split('').filter(ch => ch === L).length;
    if (total === 0) {
      return false;
    }
    return remainingCount(L) === 0;
  };

  const guess = (letter: string) => {
    if (!canInteract || status !== 'playing') {
      return;
    }
    const L = letter.toUpperCase();
    if (letterExhausted(L)) {
      return;
    }

    const nextRevealed = Array.from(revealed);
    const nextMissed = Array.from(missed);
    let nextWrong = wrong;

    // Classic hangman: reveal every occurrence of the letter at once
    const hitIndexes: number[] = [];
    word.split('').forEach((ch, idx) => {
      if (ch === L && !revealed.has(idx)) {
        hitIndexes.push(idx);
      }
    });

    if (hitIndexes.length) {
      hitIndexes.forEach(idx => nextRevealed.push(idx));
    } else {
      if (!missed.has(L)) {
        nextMissed.push(L);
      }
      nextWrong += 1;
    }

    const allDone = playableIndexes.every(i => nextRevealed.includes(i));
    let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
    if (allDone) {
      nextStatus = 'won';
    } else if (nextWrong >= MAX_WRONG) {
      nextStatus = 'lost';
    }

    const wonCount = (state.score || 0) + (nextStatus === 'won' ? 1 : 0);
    onPatch({
      activeGame: 'hangman',
      hangman: {
        wordIndex,
        revealedIndexes: nextRevealed,
        missedLetters: nextMissed,
        guessed: nextMissed,
        wrong: nextWrong,
        status: nextStatus,
      },
      score: wonCount,
      total: items.length,
    });
  };

  const goToWord = (index: number, opts?: {resetScore?: boolean}) => {
    if (!canInteract || !items.length) {
      return;
    }
    const nextIndex = Math.min(Math.max(0, index), items.length - 1);
    onPatch({
      activeGame: 'hangman',
      hangman: emptyHangmanState(nextIndex),
      ...(opts?.resetScore
        ? {score: 0, total: items.length, completed: false}
        : {}),
    });
  };

  const clue =
    String(item?.definition || '').trim() && String(item?.term || '').trim()
      ? item?.definition
      : undefined;

  return (
    <View>
      <Text style={styles.score}>
        Слово {wordIndex + 1}/{items.length || 1} · Wins: {state.score || 0}/
        {items.length}
      </Text>
      <View style={styles.hangmanLayout}>
        <HangmanFigureMobile wrong={wrong} maxWrong={MAX_WRONG} />
        <View style={styles.hangmanMain}>
          {!!clue && <Text style={styles.hint}>Clue: {clue}</Text>}
          <View style={styles.hangmanWord}>
            {word.split('').map((ch, idx) =>
              ch === ' ' ? (
                <View key={`sp-${idx}`} style={{width: 12}} />
              ) : (
                <Text key={`${idx}-${ch}`} style={styles.hangmanLetter}>
                  {revealed.has(idx) || status === 'lost' ? ch : '_'}
                </Text>
              ),
            )}
          </View>
          {status !== 'playing' ? (
            <Text style={styles.score}>
              {status === 'won' ? 'You won!' : `Lost — ${word}`}
            </Text>
          ) : null}
          <View style={styles.alphaGrid}>
            {ALPHA.map(L => {
              const used = letterExhausted(L);
              return (
                <Pressable
                  key={L}
                  disabled={!canInteract || status !== 'playing' || used}
                  style={[styles.alphaBtn, used && styles.alphaUsed]}
                  onPress={() => guess(L)}>
                  <Text style={styles.alphaText}>{L}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.row}>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract || wordIndex <= 0}
          onPress={() => goToWord(wordIndex - 1)}>
          <Text style={styles.secondaryBtnText}>Назад</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={() => goToWord(wordIndex)}>
          <Text style={styles.secondaryBtnText}>Заново</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={() => goToWord(0, {resetScore: true})}>
          <Text style={styles.secondaryBtnText}>С начала</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          disabled={!canInteract || wordIndex >= items.length - 1}
          onPress={() => goToWord(wordIndex + 1)}>
          <Text style={styles.primaryBtnText}>Далее</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HangmanFigureMobile({
  wrong,
  maxWrong = 6,
}: {
  wrong: number;
  maxWrong?: number;
}) {
  const w = Math.min(Math.max(0, wrong), maxWrong);
  const livesLeft = Math.max(0, maxWrong - w);
  const lost = w >= maxWrong;
  const limb = lost ? styles.gallowsDead : styles.gallowsLine;

  return (
    <View style={styles.gallowsWrap}>
      <View style={styles.gallowsStage}>
        <View style={styles.gallowsGround} />
        <View style={styles.gallowsBase} />
        <View style={styles.gallowsPole} />
        <View style={styles.gallowsBeam} />
        <View style={styles.gallowsRope} />
        <View
          style={[styles.gallowsHead, w < 1 && styles.gallowsGhost, lost && styles.gallowsDeadBorder]}
        />
        <View style={[styles.gallowsBody, w < 2 ? styles.gallowsGhost : limb]} />
        <View
          style={[
            styles.gallowsArmL,
            w < 3 ? styles.gallowsGhost : limb,
          ]}
        />
        <View
          style={[
            styles.gallowsArmR,
            w < 4 ? styles.gallowsGhost : limb,
          ]}
        />
        <View
          style={[
            styles.gallowsLegL,
            w < 5 ? styles.gallowsGhost : limb,
          ]}
        />
        <View
          style={[
            styles.gallowsLegR,
            w < 6 ? styles.gallowsGhost : limb,
          ]}
        />
      </View>
      <View style={styles.livesRow}>
        {Array.from({length: maxWrong}).map((_, i) => (
          <View
            key={i}
            style={[
              styles.lifeDot,
              i < livesLeft ? styles.lifeDotOn : styles.lifeDotOff,
            ]}
          />
        ))}
      </View>
      <Text style={styles.livesText}>Осталось попыток: {livesLeft}</Text>
    </View>
  );
}

function WordSearchGame({
  items,
  canInteract,
  state,
  onPatch,
  screenWidth,
  isTablet,
}: {
  items: MiniGameItem[];
  canInteract: boolean;
  state: MiniGameAnswerState;
  onPatch: (p: Partial<MiniGameAnswerState>) => void;
  screenWidth: number;
  isTablet: boolean;
}) {
  const built = useMemo(
    () => buildWordsearchGrid(items.map(i => itemWord(i))),
    [items],
  );
  const found = new Set((state.foundWords || []).map(w => w.toUpperCase()));
  const start = state.drag?.start || null;
  const hover = state.drag?.hover || null;
  const dragThrottleRef = useRef(0);
  const selected = useMemo(() => {
    if (!start || !hover) {
      return start ? [start] : [];
    }
    return lineBetween(start, hover) || [start];
  }, [start, hover]);

  const cellSize = Math.min(
    isTablet ? 34 : 28,
    Math.floor((Math.min(screenWidth, 560) - 48) / built.size),
  );

  const foundCells = useMemo(() => {
    const set = new Set<string>();
    built.placements.forEach(p => {
      if (!found.has(p.word)) {
        return;
      }
      p.cells.forEach(c => set.add(`${c.row},${c.col}`));
    });
    return set;
  }, [built.placements, found]);

  const publishDrag = (next: MiniGameAnswerState['drag']) => {
    const now = Date.now();
    if (next && now - dragThrottleRef.current < 80) {
      return;
    }
    dragThrottleRef.current = now;
    onPatch({
      activeGame: 'wordsearch',
      drag: next,
    });
  };

  const finish = (end: Cell) => {
    if (!canInteract || !start) {
      onPatch({activeGame: 'wordsearch', drag: null});
      return;
    }
    const path = lineBetween(start, end);
    if (!path || path.length < 2) {
      onPatch({activeGame: 'wordsearch', drag: null});
      return;
    }
    const letters = path.map(c => built.grid[c.row][c.col]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = built.placements.find(
      p =>
        !found.has(p.word) &&
        (p.word === letters ||
          p.word === reversed ||
          cellsKey(p.cells) === cellsKey(path) ||
          cellsKey([...p.cells].reverse()) === cellsKey(path)),
    );
    if (!match) {
      onPatch({activeGame: 'wordsearch', drag: null});
      return;
    }
    const nextFound = Array.from(
      new Set([...(state.foundWords || []), match.word]),
    );
    onPatch({
      activeGame: 'wordsearch',
      foundWords: nextFound,
      drag: null,
      score: nextFound.length,
      total: built.placements.length,
      completed: nextFound.length >= built.placements.length,
    });
  };

  return (
    <View>
      <Text style={styles.score}>
        Found: {found.size}/{built.placements.length}
      </Text>
      <View style={styles.wsWords}>
        {built.placements.map(p => (
          <Text
            key={p.word}
            style={[styles.wsChip, found.has(p.word) && styles.wsChipFound]}>
            {p.word}
          </Text>
        ))}
      </View>
      <View style={styles.wsGrid}>
        {built.grid.map((row, r) => (
          <View key={`r-${r}`} style={styles.wsRow}>
            {row.map((letter, c) => {
              const key = `${r},${c}`;
              const isSelected = selected.some(
                cell => cell.row === r && cell.col === c,
              );
              const isFound = foundCells.has(key);
              return (
                <Pressable
                  key={key}
                  disabled={!canInteract}
                  style={[
                    styles.wsCell,
                    {width: cellSize, height: cellSize},
                    isFound && styles.wsFound,
                    isSelected && styles.wsSelected,
                  ]}
                  onPressIn={() => {
                    if (!canInteract) {
                      return;
                    }
                    const cell = {row: r, col: c};
                    if (!start) {
                      dragThrottleRef.current = 0;
                      publishDrag({start: cell, hover: cell});
                      return;
                    }
                    publishDrag({start, hover: cell});
                    finish(cell);
                  }}>
                  <Text style={styles.wsLetter}>{letter}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {paddingBottom: 16},
  card: {
    marginTop: 12,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.12)',
  },
  cardTablet: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  center: {alignItems: 'center', gap: 12},
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  big: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  flashCard: {
    width: '100%',
    maxWidth: 420,
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.25)',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  flashAllGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  flashAllCard: {
    width: '47%',
    minWidth: 160,
    maxWidth: 280,
    minHeight: 150,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(63, 40, 198, 0.45)',
    backgroundColor: '#ddd6ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  flashAllCardBack: {
    backgroundColor: '#c4b5fd',
  },
  flashAllText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  row: {flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center'},
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  primaryBtnText: {color: colors.white, fontWeight: '700'},
  secondaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  secondaryBtnText: {color: colors.primary, fontWeight: '700'},
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memoryTile: {
    width: '30%',
    minWidth: 100,
    flexGrow: 1,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  memoryOpen: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
  },
  memoryMatched: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.35)',
  },
  memoryText: {color: colors.white, fontWeight: '700', textAlign: 'center'},
  memoryTextOpen: {color: colors.text},
  wheelList: {width: '100%', gap: 6, marginBottom: 8},
  wheelSeg: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  wheelSegActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  wheelSegText: {fontWeight: '700', color: colors.text},
  hangmanLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hangmanMain: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 200,
  },
  hangmanWord: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 12,
  },
  hangmanLetter: {
    fontSize: 26,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
    color: colors.text,
  },
  gallowsWrap: {
    width: 160,
    alignItems: 'center',
    gap: 8,
  },
  gallowsStage: {
    width: 160,
    height: 200,
    position: 'relative',
  },
  gallowsGround: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 3,
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
    borderRadius: 2,
  },
  gallowsBase: {
    position: 'absolute',
    left: 28,
    width: 44,
    bottom: 8,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gallowsPole: {
    position: 'absolute',
    left: 48,
    bottom: 8,
    width: 4,
    height: 160,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gallowsBeam: {
    position: 'absolute',
    left: 48,
    top: 28,
    width: 72,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gallowsRope: {
    position: 'absolute',
    left: 116,
    top: 32,
    width: 3,
    height: 18,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gallowsHead: {
    position: 'absolute',
    left: 102,
    top: 48,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  gallowsBody: {
    position: 'absolute',
    left: 115,
    top: 78,
    width: 4,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  gallowsArmL: {
    position: 'absolute',
    left: 96,
    top: 92,
    width: 24,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transform: [{rotate: '-35deg'}],
  },
  gallowsArmR: {
    position: 'absolute',
    left: 114,
    top: 92,
    width: 24,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transform: [{rotate: '35deg'}],
  },
  gallowsLegL: {
    position: 'absolute',
    left: 100,
    top: 122,
    width: 26,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transform: [{rotate: '55deg'}],
  },
  gallowsLegR: {
    position: 'absolute',
    left: 112,
    top: 122,
    width: 26,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transform: [{rotate: '-55deg'}],
  },
  gallowsGhost: {
    opacity: 0.12,
  },
  gallowsLine: {
    backgroundColor: colors.primary,
  },
  gallowsDead: {
    backgroundColor: '#dc2626',
  },
  gallowsDeadBorder: {
    borderColor: '#dc2626',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  lifeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lifeDotOn: {
    backgroundColor: '#22c55e',
  },
  lifeDotOff: {
    backgroundColor: '#e5e7eb',
  },
  livesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alphaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
  },
  alphaBtn: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  alphaUsed: {opacity: 0.35},
  alphaText: {fontWeight: '700', color: colors.text},
  wsWords: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  wsChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    fontWeight: '600',
    color: colors.text,
    overflow: 'hidden',
  },
  wsChipFound: {
    backgroundColor: '#ecfdf5',
    color: '#15803d',
    textDecorationLine: 'line-through',
  },
  wsGrid: {alignItems: 'center'},
  wsRow: {flexDirection: 'row'},
  wsCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    margin: 1,
    borderRadius: 4,
  },
  wsSelected: {backgroundColor: '#ddd6fe'},
  wsFound: {backgroundColor: '#bbf7d0'},
  wsLetter: {fontWeight: '700', fontSize: 12, color: colors.text},
});
