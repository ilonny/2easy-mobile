import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {Gesture, GestureDetector} from 'react-native-gesture-handler';

import {colors, radii} from '../../../../shared/config/theme';
import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import {
  itemWord,
  validItems,
  type MiniGameAnswerState,
  type MiniGameItem,
  type MiniGameKind,
  type MiniGamePatch,
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
/** Same duration and palette as the site spin wheel. */
const WHEEL_SPIN_MS = 7800;
const WHEEL_SPINS = 8;
const BRAND_SLICES = [
  '#C6FF75',
  '#FFA9CC',
  '#B5E8FF',
  '#C9B8FF',
  '#FFB89A',
  '#D2FF88',
  '#FF7EB3',
  '#A8D4FF',
];

/** Slow start, then a long ease-out — matches the site wheel. */
function spinEase(t: number) {
  const x = Math.min(1, Math.max(0, t));
  const split = 0.22;
  const splitDist = 0.14;
  if (x <= split) {
    const u = x / split;
    return splitDist * u * u;
  }
  const u = (x - split) / (1 - split);
  return splitDist + (1 - splitDist) * (1 - Math.pow(1 - u, 5));
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.split(`{{${key}}}`).join(String(value)),
    template,
  );
}

function splitLabel(text: string): [string, string?] {
  const t = String(text || '').trim();
  if (t.length <= 12) {
    return [t];
  }
  const mid = Math.ceil(t.length / 2);
  const space = t.lastIndexOf(' ', mid);
  if (space > 3) {
    return [t.slice(0, space), t.slice(space + 1)];
  }
  return [t.slice(0, mid), t.slice(mid)];
}

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

function FlipCard({
  flipped,
  resetKey,
  disabled,
  dimmed,
  onPress,
  style,
  frontStyle,
  backStyle,
  duration = 550,
  front,
  back,
}: {
  flipped: boolean;
  resetKey?: string | number;
  disabled?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  frontStyle?: StyleProp<ViewStyle>;
  backStyle?: StyleProp<ViewStyle>;
  duration?: number;
  front: ReactNode;
  back: ReactNode;
}) {
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  const skip = useRef(true);
  const keyRef = useRef(resetKey);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      progress.setValue(flipped ? 1 : 0);
      return;
    }
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey;
      progress.stopAnimation();
      progress.setValue(flipped ? 1 : 0);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration,
      easing: Easing.bezier(0.4, 0.2, 0.2, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [duration, flipped, progress, resetKey]);

  const frontRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = progress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = progress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const faceTransform = (rotateY: Animated.AnimatedInterpolation<string>) => [
    {perspective: 1200},
    {rotateY},
  ];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[style, dimmed && styles.flipDimmed]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flipFace,
          frontStyle,
          {opacity: frontOpacity, transform: faceTransform(frontRotate)},
        ]}>
        {front}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flipFace,
          backStyle,
          {opacity: backOpacity, transform: faceTransform(backRotate)},
        ]}>
        {back}
      </Animated.View>
    </Pressable>
  );
}

function FadeIn({
  visible,
  style,
}: {
  visible: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0.12)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0.12,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);
  return <Animated.View style={[style, {opacity}]} />;
}

function WheelRays({size, count}: {size: number; count: number}) {
  const radius = size / 2;
  const step = 3;
  const slice = 360 / Math.max(count, 1);
  const arc = (radius * step * Math.PI) / 180;
  const thickness = Math.max(6, Math.ceil(arc * 1.9));
  const rim = 12;
  const length = radius - rim - 16;
  const rays = [];
  for (let a = 0; a < 360; a += step) {
    const sliceIndex = Math.min(
      Math.max(count, 1) - 1,
      Math.floor((a + step / 2) / slice),
    );
    rays.push(
      <View
        key={a}
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: thickness,
          height: size,
          left: radius - thickness / 2,
          top: 0,
          alignItems: 'center',
          transform: [{rotate: `${a + step / 2}deg`}],
        }}>
        <View
          style={{
            width: thickness,
            height: length,
            marginTop: rim,
            backgroundColor: BRAND_SLICES[sliceIndex % BRAND_SLICES.length],
          }}
        />
      </View>,
    );
  }
  return <>{rays}</>;
}

function WheelStuds({size}: {size: number}) {
  const r = size / 2 - 7;
  return (
    <>
      {Array.from({length: 24}).map((_, i) => {
        const a = ((i / 24) * Math.PI * 2) - Math.PI / 2;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: 3,
              left: size / 2 + r * Math.cos(a) - 2.5,
              top: size / 2 + r * Math.sin(a) - 2.5,
              backgroundColor: i % 2 === 0 ? '#C4BCE8' : '#2A1C86',
            }}
          />
        );
      })}
    </>
  );
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
    (partial: MiniGamePatch) => {
      if (!canInteract) {
        return;
      }
      if (liveEnabled) {
        live.patchState(partial);
        return;
      }
      setLocalState(prev => {
        const next =
          typeof partial === 'function' ? partial(prev) : {...prev, ...partial};
        if (next === prev) {
          return prev;
        }
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
  onPatch: (patch: MiniGamePatch) => void;
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
) {
  const ids = useMemo(() => items.map(i => i.id), [items]);
  const defaultSeed = useMemo(() => hashSeed(ids.join('|')), [ids]);
  return useMemo(() => {
    if (state.order?.length) {
      return state.order;
    }
    const seed = state.layoutSeed ?? defaultSeed;
    return shuffle ? shuffleWithSeed(ids, seed) : ids;
  }, [defaultSeed, ids, shuffle, state.layoutSeed, state.order]);
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
  onPatch: (patch: MiniGamePatch) => void;
}) {
  const {t} = useI18n();
  const order = useSharedCardOrder(items, shuffle, state);
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
          {fill(t('editor.miniGameDone'), {
            known: items.length,
            total: items.length,
          })}
        </Text>
        <Text style={styles.big}>{t('editor.miniGameAllPassed')}</Text>
        {canInteract ? (
          <Pressable style={styles.primaryBtn} onPress={restartAll}>
            <Text style={styles.primaryBtnText}>{t('editor.miniGameRestart')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.score}>
        {fill(t('editor.miniGameKnown'), {
          known: known.size,
          total: items.length,
        })}
      </Text>
      <FlipCard
        flipped={flipped}
        resetKey={currentId || 'card'}
        disabled={!canInteract}
        dimmed={!canInteract}
        duration={550}
        onPress={() =>
          canInteract && onPatch(prev => ({...prev, flipped: !prev.flipped}))
        }
        style={styles.flashCard}
        frontStyle={styles.flashFaceFront}
        backStyle={styles.flashFaceBack}
        front={
          <>
            <Text style={styles.big}>{String(current?.term || '') || ' '}</Text>
            <Text style={styles.flashHint}>{t('editor.miniGameFlipHint')}</Text>
          </>
        }
        back={
          <>
            <Text style={styles.big}>
              {String(current?.definition || '') || ' '}
            </Text>
            <Text style={styles.flashHint}>{t('editor.miniGameFlipHint')}</Text>
          </>
        }
      />
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
          <Text style={styles.secondaryBtnText}>{t('editor.miniGameAgain')}</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          disabled={!canInteract || !current}
          onPress={() => {
            if (!canInteract || !current) {
              return;
            }
            onPatch(prev => {
              const nextKnown = Array.from(
                new Set([...(prev.knownIds || []), current.id]),
              );
              return {
                ...prev,
                activeGame: 'flash-cards',
                knownIds: nextKnown,
                score: nextKnown.length,
                total: items.length,
                completed: nextKnown.length >= items.length,
                flipped: false,
                cardIndex: 0,
              };
            });
          }}>
          <Text style={styles.primaryBtnText}>{t('editor.miniGameNext')}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={restartAll}>
          <Text style={styles.secondaryBtnText}>{t('editor.miniGameRestart')}</Text>
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
  onPatch: (patch: MiniGamePatch) => void;
}) {
  const {t} = useI18n();
  const order = useSharedCardOrder(items, shuffle, state);
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
      <Text style={styles.score}>
        {fill(t('editor.miniGameCardCount'), {total: items.length})}
      </Text>
      <View style={styles.flashAllGrid}>
        {order.map(id => {
          const item = byId.get(id);
          if (!item) {
            return null;
          }
          const flipped = flippedIds.has(id);
          return (
            <FlipCard
              key={id}
              flipped={flipped}
              resetKey={id}
              disabled={!canInteract}
              dimmed={!canInteract}
              duration={450}
              onPress={() => {
                if (!canInteract) {
                  return;
                }
                onPatch(prev => {
                  const next = new Set(prev.flippedIds || []);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  const viewed = Array.from(
                    new Set([...(prev.knownIds || []), id]),
                  );
                  return {
                    ...prev,
                    activeGame: 'flash-cards',
                    flippedIds: Array.from(next),
                    knownIds: viewed,
                    score: viewed.length,
                    total: items.length,
                    completed: viewed.length >= items.length,
                  };
                });
              }}
              style={styles.flashAllCard}
              frontStyle={styles.flashAllFaceFront}
              backStyle={styles.flashAllFaceBack}
              front={
                <Text style={styles.flashAllText}>
                  {String(item.term || '') || ' '}
                </Text>
              }
              back={
                <Text style={styles.flashAllText}>
                  {String(item.definition || '') || ' '}
                </Text>
              }
            />
          );
        })}
      </View>
      {canInteract ? (
        <Pressable style={styles.secondaryBtn} onPress={restartAll}>
          <Text style={styles.secondaryBtnText}>{t('editor.miniGameRestart')}</Text>
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
  onPatch: (patch: MiniGamePatch) => void;
}) {
  const {t} = useI18n();
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
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
    }
    resolveTimerRef.current = setTimeout(() => {
      resolveTimerRef.current = null;
      onPatch(prev => {
        const open = prev.openIds || [];
        if (open[0] !== aId || open[1] !== bId) {
          return prev;
        }
        if (a && b && a.pairId === b.pairId && a.id !== b.id) {
          const nextMatched = Array.from(
            new Set([...(prev.matchedPairIds || []), a.pairId]),
          );
          return {
            ...prev,
            activeGame: 'matching-pairs',
            matchedPairIds: nextMatched,
            openIds: [],
            score: nextMatched.length,
            total: items.length,
            completed: nextMatched.length >= items.length,
          };
        }
        return {
          ...prev,
          activeGame: 'matching-pairs',
          openIds: [],
        };
      });
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
    onPatch(prev => {
      const open = prev.openIds || [];
      if (open.length >= 2 || open.includes(tile.id)) {
        return prev;
      }
      if ((prev.matchedPairIds || []).includes(tile.pairId)) {
        return prev;
      }
      return {
        ...prev,
        activeGame: 'matching-pairs',
        openIds: [...open, tile.id],
      };
    });
  };

  return (
    <View>
      <Text style={styles.score}>
        {fill(t('editor.miniGamePairs'), {
          matched: matched.size,
          total: items.length,
        })}
      </Text>
      <View style={styles.memoryGrid}>
        {tiles.map(tile => {
          const isMatched = matched.has(tile.pairId);
          const isOpen = isMatched || openIds.includes(tile.id);
          return (
            <FlipCard
              key={tile.id}
              flipped={isOpen}
              resetKey={tile.id}
              disabled={!canInteract || isMatched}
              duration={220}
              onPress={() => onTile(tile)}
              style={styles.memoryTile}
              frontStyle={styles.memoryFront}
              backStyle={isMatched ? styles.memoryMatched : styles.memoryOpen}
              front={<Text style={styles.memoryText}>?</Text>}
              back={
                <Text
                  style={[
                    styles.memoryText,
                    isMatched ? styles.memoryTextMatched : styles.memoryTextOpen,
                  ]}>
                  {tile.text}
                </Text>
              }
            />
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
  onPatch: (patch: MiniGamePatch) => void;
}) {
  const {t} = useI18n();
  const {width: screenW} = useWindowDimensions();
  const size = Math.min(Math.max(screenW - 72, 260), 420);
  const labels = useMemo(
    () =>
      items.map(i => ({
        id: i.id,
        text: showDefinition && i.definition ? i.definition : i.term,
      })),
    [items, showDefinition],
  );
  const n = Math.max(labels.length, 1);
  const slice = 360 / n;
  const targetId = state.spinTargetId || state.lastSpinItemId || null;
  const targetIndex = targetId
    ? labels.findIndex(l => l.id === targetId)
    : -1;
  const hasTarget = targetIndex >= 0;
  const spinToken = state.spinToken || 0;
  const spinStartedAt = state.spinStartedAtMs || null;
  const spinDuration = state.spinDurationMs || WHEEL_SPIN_MS;
  const targetDeg = hasTarget
    ? WHEEL_SPINS * 360 -
      (targetIndex * slice + slice / 2) +
      spinToken * 360
    : 0;
  const result = hasTarget ? labels[targetIndex] : undefined;
  const [spinning, setSpinning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) {
        setReduceMotion(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasTarget || !spinStartedAt) {
      rotation.setValue(0);
      setSpinning(false);
      return;
    }
    const elapsed = Math.max(0, Date.now() - spinStartedAt);
    if (elapsed >= spinDuration || reduceMotion) {
      rotation.setValue(targetDeg);
      setSpinning(false);
      return;
    }
    const startEase = spinEase(elapsed / spinDuration);
    rotation.setValue(targetDeg * startEase);
    setSpinning(true);
    const remaining = spinDuration - elapsed;
    const anim = Animated.timing(rotation, {
      toValue: targetDeg,
      duration: remaining,
      easing: (t: number) => {
        const fullT = elapsed / spinDuration + t * (remaining / spinDuration);
        const eased = spinEase(fullT);
        const denom = 1 - startEase;
        if (denom <= 0.0001) {
          return 1;
        }
        return (eased - startEase) / denom;
      },
      useNativeDriver: true,
    });
    anim.start(({finished}) => {
      if (finished) {
        setSpinning(false);
      }
    });
    return () => anim.stop();
  }, [
    hasTarget,
    reduceMotion,
    rotation,
    spinDuration,
    spinStartedAt,
    targetDeg,
  ]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const spin = () => {
    if (!canInteract || spinning || !labels.length) {
      return;
    }
    const index = Math.floor(Math.random() * labels.length);
    const picked = labels[index];
    if (!picked) {
      return;
    }
    const token = (state.spinToken || 0) + 1;
    const startedAt = Date.now();
    onPatch(prev => {
      if ((prev.spinToken || 0) >= token) {
        return prev;
      }
      return {
        ...prev,
        activeGame: 'spin-wheel',
        spinTargetId: picked.id,
        lastSpinItemId: picked.id,
        spinStartedAtMs: startedAt,
        spinDurationMs: WHEEL_SPIN_MS,
        spinToken: token,
        score: (prev.score || 0) + 1,
        total: labels.length,
      };
    });
  };

  const radius = size / 2;
  const labelR = radius * 0.58;
  const fontSize = Math.max(
    10,
    Math.round((n > 9 ? 13 : n > 7 ? 15 : 16) * (size / 420)),
  );
  const hub = Math.round(size * 0.28);

  return (
    <View style={styles.center}>
      {labels.length ? (
        <View
          accessibilityLabel={t('editor.miniGameSpinAria')}
          style={[styles.wheelShell, {width: size, height: size + 18}]}>
          <View
            style={[
              styles.wheelDisc,
              {width: size, height: size, borderRadius: radius, marginTop: 14},
            ]}>
            <Animated.View
              style={{
                width: size,
                height: size,
                transform: [{rotate}],
              }}>
              <WheelRays size={size} count={labels.length} />
              {labels.map((label, i) => {
                const mid = i * slice + slice / 2;
                const pos = polar(radius, radius, labelR, mid);
                const [line1, line2] = splitLabel(label.text);
                const labelW = Math.max(
                  48,
                  Math.min(radius * 0.72, ((2 * Math.PI * labelR) / n) * 0.86),
                );
                return (
                  <View
                    key={label.id}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: pos.x - labelW / 2,
                      top: pos.y - (line2 ? 16 : 10),
                      width: labelW,
                    }}>
                    <Text
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}
                      style={[styles.wheelLabel, {fontSize}]}>
                      {line2 ? `${line1}\n${line2}` : line1}
                    </Text>
                  </View>
                );
              })}
              <View
                pointerEvents="none"
                style={[
                  styles.wheelHub,
                  {
                    width: hub,
                    height: hub,
                    borderRadius: hub / 2,
                    left: radius - hub / 2,
                    top: radius - hub / 2,
                  },
                ]}>
                <Text style={styles.wheelHubText}>2EASY</Text>
              </View>
            </Animated.View>
            <WheelStuds size={size} />
          </View>
          <View style={styles.wheelPin} />
        </View>
      ) : null}
      <Text style={styles.wheelResult}>
        {spinning ? '…' : result?.text || ' '}
      </Text>
      <Pressable
        style={styles.primaryBtn}
        disabled={!canInteract || spinning}
        onPress={spin}>
        <Text style={styles.primaryBtnText}>
          {spinning ? '...' : t('editor.miniGameSpin')}
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
  onPatch: (patch: MiniGamePatch) => void;
}) {
  const {t} = useI18n();
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
    onPatch(prev => {
      const h = prev.hangman;
      if (h && (h.wordIndex !== wordIndex || h.status !== 'playing')) {
        return prev;
      }
      const revealedNow = new Set(h?.revealedIndexes || []);
      const missedNow = new Set(
        (h?.missedLetters?.length ? h.missedLetters : h?.guessed || []).map(
          g => g.toUpperCase(),
        ),
      );
      if (missedNow.has(L)) {
        return prev;
      }
      const totalInWord = word.split('').filter(ch => ch === L).length;
      const already = word
        .split('')
        .filter((ch, idx) => ch === L && revealedNow.has(idx)).length;
      if (totalInWord > 0 && already >= totalInWord) {
        return prev;
      }

      const nextRevealed = Array.from(revealedNow);
      const nextMissed = Array.from(missedNow);
      let nextWrong = h?.wrong ?? missedNow.size;
      const hitIndexes: number[] = [];
      word.split('').forEach((ch, idx) => {
        if (ch === L && !revealedNow.has(idx)) {
          hitIndexes.push(idx);
        }
      });
      if (hitIndexes.length) {
        hitIndexes.forEach(idx => nextRevealed.push(idx));
      } else {
        nextMissed.push(L);
        nextWrong += 1;
      }

      const allDone = playableIndexes.every(i => nextRevealed.includes(i));
      let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
      if (allDone) {
        nextStatus = 'won';
      } else if (nextWrong >= MAX_WRONG) {
        nextStatus = 'lost';
      }
      const wonCount =
        (prev.score || 0) + (nextStatus === 'won' && h?.status !== 'won' ? 1 : 0);
      return {
        ...prev,
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
      };
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
        {fill(t('editor.miniGameWordOf'), {
          current: wordIndex + 1,
          total: items.length || 1,
          wins: state.score || 0,
        })}
      </Text>
      <View style={styles.hangmanLayout}>
        <HangmanFigureMobile wrong={wrong} maxWrong={MAX_WRONG} />
        <View style={styles.hangmanMain}>
          {!!clue && (
            <Text style={styles.hint}>
              {fill(t('editor.miniGameClue'), {clue})}
            </Text>
          )}
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
              {status === 'won'
                ? t('editor.miniGameWon')
                : fill(t('editor.miniGameLost'), {word})}
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
          <Text style={styles.secondaryBtnText}>{t('common.back')}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={() => goToWord(wordIndex)}>
          <Text style={styles.secondaryBtnText}>{t('editor.miniGameRetry')}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!canInteract}
          onPress={() => goToWord(0, {resetScore: true})}>
          <Text style={styles.secondaryBtnText}>
            {t('editor.miniGameFromStart')}
          </Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          disabled={!canInteract || wordIndex >= items.length - 1}
          onPress={() => goToWord(wordIndex + 1)}>
          <Text style={styles.primaryBtnText}>{t('editor.miniGameNext')}</Text>
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
  const {t} = useI18n();
  const w = Math.min(Math.max(0, wrong), maxWrong);
  const livesLeft = Math.max(0, maxWrong - w);
  const lost = w >= maxWrong;
  const limb = lost ? styles.gallowsDead : styles.gallowsLine;

  return (
    <View
      accessibilityLabel={fill(t('editor.miniGameHangmanAria'), {
        wrong: w,
        max: maxWrong,
      })}
      style={styles.gallowsWrap}>
      <View style={styles.gallowsStage}>
        <View style={styles.gallowsGround} />
        <View style={styles.gallowsBase} />
        <View style={styles.gallowsPole} />
        <View style={styles.gallowsBeam} />
        <View style={styles.gallowsRope} />
        <FadeIn
          visible={w >= 1}
          style={[styles.gallowsHead, lost && styles.gallowsDeadBorder]}
        />
        <FadeIn
          visible={w >= 2}
          style={[styles.gallowsBody, lost ? styles.gallowsDead : limb]}
        />
        <FadeIn
          visible={w >= 3}
          style={[styles.gallowsArmL, lost ? styles.gallowsDead : limb]}
        />
        <FadeIn
          visible={w >= 4}
          style={[styles.gallowsArmR, lost ? styles.gallowsDead : limb]}
        />
        <FadeIn
          visible={w >= 5}
          style={[styles.gallowsLegL, lost ? styles.gallowsDead : limb]}
        />
        <FadeIn
          visible={w >= 6}
          style={[styles.gallowsLegR, lost ? styles.gallowsDead : limb]}
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
      <Text style={styles.livesText}>
        {fill(t('editor.miniGameLivesLeft'), {count: livesLeft})}
      </Text>
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
  onPatch: (patch: MiniGamePatch) => void;
  screenWidth: number;
  isTablet: boolean;
}) {
  const {t} = useI18n();
  const built = useMemo(
    () => buildWordsearchGrid(items.map(i => itemWord(i))),
    [items],
  );
  const found = new Set((state.foundWords || []).map(w => w.toUpperCase()));
  const [finger, setFinger] = useState<{start: Cell; hover: Cell} | null>(
    null,
  );
  const start = finger?.start || state.drag?.start || null;
  const hover = finger?.hover || state.drag?.hover || null;
  const dragThrottleRef = useRef(0);
  const sessionRef = useRef(false);
  const startRef = useRef<Cell | null>(null);
  const hoverRef = useRef<Cell | null>(null);
  const pitchRef = useRef(1);
  const sizeRef = useRef(built.size);
  const builtRef = useRef(built);
  const foundWordsRef = useRef(state.foundWords);
  const onPatchRef = useRef(onPatch);
  const canInteractRef = useRef(canInteract);
  builtRef.current = built;
  foundWordsRef.current = state.foundWords;
  onPatchRef.current = onPatch;
  canInteractRef.current = canInteract;
  const selected = useMemo(() => {
    if (!start || !hover) {
      return start ? [start] : [];
    }
    return lineBetween(start, hover) || [start];
  }, [start, hover]);

  const cellSize = Math.min(
    isTablet ? 34 : 28,
    Math.floor((Math.min(screenWidth, 560) - 48) / Math.max(built.size, 1)),
  );
  const pitch = cellSize + 2;
  pitchRef.current = pitch;
  sizeRef.current = built.size;

  const cellAt = (x: number, y: number, clamp: boolean): Cell | null => {
    const span = pitchRef.current;
    const n = sizeRef.current;
    if (span <= 0 || n <= 0) {
      return null;
    }
    let col = Math.floor(x / span);
    let row = Math.floor(y / span);
    if (clamp) {
      col = Math.min(n - 1, Math.max(0, col));
      row = Math.min(n - 1, Math.max(0, row));
    } else if (row < 0 || col < 0 || row >= n || col >= n) {
      return null;
    }
    return {row, col};
  };

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
    onPatchRef.current({
      activeGame: 'wordsearch',
      drag: next,
    });
  };

  const finish = (from: Cell, end: Cell) => {
    if (!canInteractRef.current) {
      onPatchRef.current({activeGame: 'wordsearch', drag: null});
      return;
    }
    const grid = builtRef.current;
    const foundSet = new Set(
      (foundWordsRef.current || []).map(w => w.toUpperCase()),
    );
    const path = lineBetween(from, end);
    if (!path || path.length < 2) {
      onPatchRef.current({activeGame: 'wordsearch', drag: null});
      return;
    }
    const letters = path.map(c => grid.grid[c.row][c.col]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = grid.placements.find(
      p =>
        !foundSet.has(p.word) &&
        (p.word === letters ||
          p.word === reversed ||
          cellsKey(p.cells) === cellsKey(path) ||
          cellsKey([...p.cells].reverse()) === cellsKey(path)),
    );
    if (!match) {
      onPatchRef.current({activeGame: 'wordsearch', drag: null});
      return;
    }
    const word = match.word;
    onPatchRef.current(prev => {
      const already = new Set(
        (prev.foundWords || []).map(item => item.toUpperCase()),
      );
      if (already.has(word)) {
        return {...prev, activeGame: 'wordsearch', drag: null};
      }
      const nextFound = [...(prev.foundWords || []), word];
      return {
        ...prev,
        activeGame: 'wordsearch',
        foundWords: nextFound,
        drag: null,
        score: nextFound.length,
        total: grid.placements.length,
        completed: nextFound.length >= grid.placements.length,
      };
    });
  };

  const handlersRef = useRef({
    begin: (_x: number, _y: number) => {},
    move: (_x: number, _y: number) => {},
    end: (_x?: number, _y?: number) => {},
  });
  handlersRef.current = {
    begin: (x, y) => {
      if (!canInteractRef.current) {
        return;
      }
      const cell = cellAt(x, y, false);
      if (!cell) {
        return;
      }
      sessionRef.current = true;
      startRef.current = cell;
      hoverRef.current = cell;
      dragThrottleRef.current = 0;
      setFinger({start: cell, hover: cell});
      publishDrag({start: cell, hover: cell});
    },
    move: (x, y) => {
      if (!sessionRef.current || !startRef.current) {
        return;
      }
      const cell = cellAt(x, y, true);
      if (
        !cell ||
        (hoverRef.current?.row === cell.row &&
          hoverRef.current?.col === cell.col)
      ) {
        return;
      }
      hoverRef.current = cell;
      const from = startRef.current;
      setFinger({start: from, hover: cell});
      publishDrag({start: from, hover: cell});
    },
    end: (x, y) => {
      if (!sessionRef.current) {
        return;
      }
      sessionRef.current = false;
      const from = startRef.current;
      const endCell =
        x != null && y != null ? cellAt(x, y, true) : hoverRef.current;
      startRef.current = null;
      hoverRef.current = null;
      setFinger(null);
      if (from && endCell) {
        finish(from, endCell);
      } else {
        onPatchRef.current({activeGame: 'wordsearch', drag: null});
      }
    },
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canInteract)
        .maxPointers(1)
        .minDistance(0)
        .manualActivation(true)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onTouchesDown((event, manager) => {
          if (!canInteractRef.current) {
            manager.fail();
            return;
          }
          manager.activate();
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          if (touch) {
            handlersRef.current.begin(touch.x, touch.y);
          }
        })
        .onTouchesMove(event => {
          const touch = event.allTouches[0] ?? event.changedTouches[0];
          if (touch) {
            handlersRef.current.move(touch.x, touch.y);
          }
        })
        .onTouchesUp(event => {
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          handlersRef.current.end(touch?.x, touch?.y);
        })
        .onTouchesCancelled(() => {
          handlersRef.current.end();
        }),
    [canInteract],
  );

  return (
    <View>
      <Text style={styles.score}>
        {fill(t('editor.miniGameFound'), {
          found: found.size,
          total: built.placements.length,
        })}
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
      <GestureDetector gesture={pan}>
        <View collapsable={false} style={styles.wsGrid}>
          {built.grid.map((row, r) => (
            <View key={`r-${r}`} style={styles.wsRow}>
              {row.map((letter, c) => {
                const key = `${r},${c}`;
                const isSelected = selected.some(
                  cell => cell.row === r && cell.col === c,
                );
                const isFound = foundCells.has(key);
                return (
                  <View
                    key={key}
                    style={[
                      styles.wsCell,
                      {width: cellSize, height: cellSize},
                      isFound && styles.wsFound,
                      isSelected && styles.wsSelected,
                    ]}>
                    <Text style={styles.wsLetter}>{letter}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </GestureDetector>
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
  flipFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  flipDimmed: {opacity: 0.85},
  flashCard: {
    width: '100%',
    maxWidth: 420,
    minHeight: 220,
    alignSelf: 'center',
  },
  flashFaceFront: {
    backgroundColor: '#f7f7ff',
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.25)',
  },
  flashFaceBack: {
    backgroundColor: '#efeaff',
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.25)',
  },
  flashHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
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
    minHeight: 168,
  },
  flashAllFaceFront: {
    backgroundColor: '#ddd6ff',
    borderWidth: 2,
    borderColor: 'rgba(63, 40, 198, 0.45)',
  },
  flashAllFaceBack: {
    backgroundColor: '#c4b5fd',
    borderWidth: 2,
    borderColor: 'rgba(63, 40, 198, 0.45)',
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
    minHeight: 88,
  },
  memoryFront: {
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  memoryOpen: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
    borderRadius: 14,
  },
  memoryMatched: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.35)',
    borderRadius: 14,
  },
  memoryText: {color: colors.white, fontWeight: '700', textAlign: 'center'},
  memoryTextOpen: {color: colors.text},
  memoryTextMatched: {color: '#15803d'},
  wheelShell: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  wheelDisc: {
    backgroundColor: '#4A38B8',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  wheelPin: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: -13,
    zIndex: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#4A38B8',
    elevation: 12,
  },
  wheelLabel: {
    fontWeight: '800',
    color: '#181818',
    textAlign: 'center',
  },
  wheelHub: {
    position: 'absolute',
    backgroundColor: '#F4F2FB',
    borderWidth: 3,
    borderColor: '#4A38B8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  wheelHubText: {
    color: '#5A42D4',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: -0.4,
  },
  wheelResult: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    minHeight: 28,
  },
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
    left: 83,
    top: 124,
    width: 34,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transformOrigin: 'right center',
    transform: [{rotate: '-58deg'}],
  },
  gallowsLegR: {
    position: 'absolute',
    left: 117,
    top: 124,
    width: 34,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transformOrigin: 'left center',
    transform: [{rotate: '58deg'}],
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
  wsGrid: {alignSelf: 'center'},
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
