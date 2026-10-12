import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {
  normalizeUnscrambleToken,
  parseSlotAnswerKey,
  shuffleItems,
  slotAnswerKey,
  type UnscrambleSentence,
} from '../../lib/unscrambleWords';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {answerFeedback} from '../interaction/answerFeedback';

type Props = {data: any};

type AnswerStatus = 'correct' | 'incorrect' | 'neutral';
type AnswersMap = Record<
  string,
  {value?: string; status?: AnswerStatus; tokenId?: string}
>;

type PoolItem = {
  id: string;
  sentenceId: string;
  value: string;
};

export function UnscrambleWordsExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers, resetSeq} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const sentences: UnscrambleSentence[] = useMemo(
    () =>
      ((data?.sentences as UnscrambleSentence[]) || []).filter(
        s => Array.isArray(s?.tokens) && s.tokens.length >= 2,
      ),
    [data?.sentences],
  );

  const sentencesById = useMemo(() => {
    const m = new Map<string, UnscrambleSentence>();
    sentences.forEach(s => m.set(s.id, s));
    return m;
  }, [sentences]);

  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();
  const scopeRef = useRef<View>(null);

  const [map, setMap] = useState<AnswersMap>({});
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [poolOrder, setPoolOrder] = useState<Record<string, string[]>>({});
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragPoolKey = useMemo(() => {
    const ex = data?.id ?? 'new';
    const part = sentences
      .map(
        s =>
          `${s.id}:${(s.tokens || []).map(t => `${t.id}:${t.value}`).join('|')}`,
      )
      .join(';');
    return `${ex}|${part}`;
  }, [data?.id, sentences]);

  useEffect(() => {
    const next: Record<string, string[]> = {};
    sentences.forEach(s => {
      next[s.id] = shuffleItems((s.tokens || []).map(t => t.id));
    });
    setPoolOrder(next);
    // Reshuffle when exercise structure changes or answers are reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPoolKey, resetSeq]);

  useEffect(() => {
    setMap({});
    setSelectedPoolId(null);
  }, [resetSeq]);

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        setMap({});
        return;
      }
      const parsedRaw = JSON.parse(raw);
      const parsed: AnswersMap = {};
      Object.keys(parsedRaw || {}).forEach(k => {
        const v = parsedRaw[k];
        if (v && typeof v === 'object') {
          parsed[k] = {
            value: v.value,
            status: v.status,
            tokenId: v.tokenId,
          };
        } else {
          parsed[k] = {value: String(v || ''), status: 'neutral'};
        }
      });
      setMap(parsed);
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    (next: AnswersMap) => {
      if (isTeacher) {
        return;
      }
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        void writeAnswer(data.id, JSON.stringify(next));
      }, 400);
    },
    [data.id, writeAnswer, isTeacher],
  );

  const setAnswer = (
    answerKey: string,
    value: string,
    status: AnswerStatus,
    tokenId?: string,
  ) => {
    const next = {...map, [answerKey]: {value, status, tokenId}};
    setMap(next);
    persist(next);
  };

  const placeOnSlot = (
    targetKey: string,
    chipId: string,
    label: string,
  ): boolean => {
    const {sentenceId, slotIndex} = parseSlotAnswerKey(targetKey);
    const sentence = sentencesById.get(sentenceId);
    const expected = sentence?.tokens?.[slotIndex];
    if (!expected) {
      return false;
    }
    // Chip must belong to this sentence's pool.
    const chipToken = (sentence.tokens || []).find(t => t.id === chipId);
    if (!chipToken) {
      return false;
    }
    if (map[targetKey]?.status === 'correct') {
      return false;
    }
    const ok =
      normalizeUnscrambleToken(expected.value) ===
      normalizeUnscrambleToken(label);
    setAnswer(
      targetKey,
      label,
      ok ? 'correct' : 'incorrect',
      ok ? chipId : undefined,
    );
    setSelectedPoolId(null);
    return ok;
  };

  const poolBySentence = useMemo(() => {
    const result = new Map<string, PoolItem[]>();
    sentences.forEach(s => {
      const order = poolOrder[s.id] || (s.tokens || []).map(t => t.id);
      const byId = new Map((s.tokens || []).map(t => [t.id, t]));

      const usedTokenIds = new Set<string>();
      Object.entries(map).forEach(([key, a]) => {
        if (!key.startsWith(`${s.id}:`)) {
          return;
        }
        if (a?.status === 'correct' && a.tokenId) {
          usedTokenIds.add(a.tokenId);
        }
      });

      let items: PoolItem[] = order
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(t => ({
          id: t!.id,
          sentenceId: s.id,
          value: t!.value,
        }));

      if (usedTokenIds.size) {
        items = items.filter(p => !usedTokenIds.has(p.id));
      } else {
        const usedValues = new Set(
          Object.entries(map)
            .filter(
              ([key, a]) =>
                key.startsWith(`${s.id}:`) &&
                a?.status === 'correct' &&
                normalizeUnscrambleToken(a.value || ''),
            )
            .map(([, a]) => normalizeUnscrambleToken(a.value || '')),
        );
        if (usedValues.size) {
          const claimed = new Set<string>();
          items = items.filter(p => {
            const key = normalizeUnscrambleToken(p.value);
            if (!usedValues.has(key) || claimed.has(p.id)) {
              return true;
            }
            claimed.add(p.id);
            usedValues.delete(key);
            return false;
          });
        }
      }

      result.set(s.id, items);
    });
    return result;
  }, [sentences, poolOrder, map]);

  const bgImages = data?.images?.length ? data.images : [];

  return (
    <View ref={scopeRef} style={styles.root} collapsable={false}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!bgImages.length && (
        <ImageGallery images={bgImages} viewType="carousel" />
      )}

      {sentences.map(sentence => {
        const pool = poolBySentence.get(sentence.id) || [];
        return (
          <View key={sentence.id} style={styles.block}>
            {!!pool.length && (
              <View style={styles.pool}>
                {pool.map(item => (
                  <DraggableChip
                    key={item.id}
                    id={item.id}
                    label={item.value}
                    selected={selectedPoolId === item.id}
                    onSelect={() => setSelectedPoolId(item.id)}
                    hitTestDropTarget={hitTestDropTarget}
                    onDropOnTarget={(targetId, chipId, label) =>
                      placeOnSlot(targetId, chipId, label)
                    }
                  />
                ))}
              </View>
            )}
            <View style={styles.slots}>
              {(sentence.tokens || []).map((tok, slotIndex) => {
                const answerKey = slotAnswerKey(sentence.id, slotIndex);
                const ans = map[answerKey];
                const status = ans?.status || 'neutral';
                const value = ans?.value || '';
                return (
                  <DropZone
                    key={answerKey}
                    id={answerKey}
                    registerRef={registerRef}
                    highlight={
                      !!selectedPoolId &&
                      status !== 'correct' &&
                      pool.some(p => p.id === selectedPoolId)
                    }
                    style={[
                      styles.slot,
                      answerFeedback.slot,
                      status === 'incorrect' && answerFeedback.bad,
                      status === 'correct' && answerFeedback.ok,
                      status === 'neutral' && !!value && answerFeedback.ok,
                    ]}>
                    <Text
                      onPress={() => {
                        if (status === 'correct') {
                          return;
                        }
                        if (!selectedPoolId) {
                          return;
                        }
                        const item = pool.find(p => p.id === selectedPoolId);
                        if (item) {
                          placeOnSlot(answerKey, item.id, item.value);
                        }
                      }}
                      style={[
                        styles.slotText,
                        status === 'incorrect' && answerFeedback.badText,
                        (status === 'correct' ||
                          (!!value && status !== 'incorrect')) &&
                          answerFeedback.okText,
                      ]}>
                      {value || (selectedPoolId ? '⬇' : '····')}
                    </Text>
                  </DropZone>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible', zIndex: 1},
  block: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    overflow: 'visible',
    zIndex: 2,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
    zIndex: 1,
  },
  slot: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {color: colors.primary, fontWeight: '700'},
});
