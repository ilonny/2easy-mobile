import {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {answerFeedback} from '../interaction/answerFeedback';

type Props = {data: any};

type Match = {
  id: string | number;
  value: string;
  correctValue: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Saved answers often store numeric ids; exercise matches may keep them as strings. */
const sameId = (
  a: string | number | undefined | null,
  b: string | number | undefined | null,
) => a != null && b != null && String(a) === String(b);

const hasId = (
  ids: Array<string | number> | undefined,
  id: string | number | undefined | null,
) => !!ids?.some(x => sameId(x, id));

const mapVal = (map: Record<string, string> | undefined, id: string | number) =>
  map?.[String(id)] ?? (map as Record<string | number, string> | undefined)?.[id];

export function MatchWordWordExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher, isEdit} =
    useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const matches: Match[] = data?.matches || [];
  const [correctIds, setCorrectIds] = useState<Array<string | number>>([]);
  const [incorrectIdsMap, setIncorrectIdsMap] = useState<Record<string, string>>(
    {},
  );
  const [selectedLeft, setSelectedLeft] = useState<string | number>();
  const [selectedRight, setSelectedRight] = useState<string | number>();
  const [flashWrong, setFlashWrong] = useState<string>();

  /** Site parity: teacher / constructor sees the matching pair on tap. */
  const showCorrectHint = isTeacher || isEdit;

  /** Stable shuffle of definition order; refresh when pair ids change (preview remounts ids). */
  const matchIdsKey = matches.map(m => String(m.id)).join('|');
  const rightOrder = useMemo(
    () => shuffle(matches.map(m => m.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchIdsKey],
  );

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setCorrectIds(parsed?.correctIds || []);
      setIncorrectIdsMap(parsed?.incorrectIdsMap || {});
    } catch {}
  }, [answers, data?.id]);

  const persist = (
    nextCorrect: Array<string | number>,
    nextIncorrect: Record<string, string>,
  ) => {
    writeAnswer(
      data.id,
      JSON.stringify({correctIds: nextCorrect, incorrectIdsMap: nextIncorrect}),
    );
  };

  const tryMatch = (leftId: string | number, rightId: string | number) => {
    const left = matches.find(m => sameId(m.id, leftId));
    const right = matches.find(m => sameId(m.id, rightId));
    if (!left || !right) return;

    if (sameId(leftId, rightId)) {
      const next = hasId(correctIds, leftId)
        ? correctIds
        : correctIds.concat(leftId);
      setCorrectIds(next);
      persist(next, incorrectIdsMap);
    } else {
      const nextIncorrect = {
        ...incorrectIdsMap,
        [String(leftId)]: right.correctValue,
      };
      setIncorrectIdsMap(nextIncorrect);
      setFlashWrong(String(leftId));
      setTimeout(() => setFlashWrong(undefined), 1200);
      persist(correctIds, nextIncorrect);
    }
    setSelectedLeft(undefined);
    setSelectedRight(undefined);
  };

  const onLeft = (id: string | number) => {
    if (hasId(correctIds, id)) return;
    if (selectedRight !== undefined) {
      tryMatch(id, selectedRight);
      return;
    }
    setSelectedLeft(id);
  };

  const onRight = (id: string | number) => {
    if (hasId(correctIds, id)) return;
    if (selectedLeft !== undefined) {
      tryMatch(selectedLeft, id);
      return;
    }
    setSelectedRight(id);
  };

  const remainingLeft = matches.filter(m => !hasId(correctIds, m.id));
  const remainingRight = rightOrder
    .map(id => matches.find(m => sameId(m.id, id)))
    .filter((m): m is Match => !!m && !hasId(correctIds, m.id));
  const incorrectedMatches = matches
    .filter(m => mapVal(incorrectIdsMap, m.id) && !hasId(correctIds, m.id))
    .map(m => ({...m, selectedValue: mapVal(incorrectIdsMap, m.id)}));
  const correctedMatches = matches.filter(m => hasId(correctIds, m.id));

  const bgImages = data?.images?.length ? [data.images[0]] : [];

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!bgImages.length && (
        <ImageGallery images={bgImages} viewType="carousel" />
      )}
      {!!(remainingLeft.length || remainingRight.length) && (
        <View style={styles.cols}>
          <View style={styles.col}>
            {remainingLeft.map(m => {
              const hintOk =
                showCorrectHint &&
                selectedRight !== undefined &&
                sameId(m.id, selectedRight);
              return (
                <Pressable
                  key={`L-${m.id}`}
                  style={[
                    styles.chip,
                    sameId(selectedLeft, m.id) && styles.chipOn,
                    hintOk && styles.chipHint,
                    flashWrong === String(m.id) && styles.chipBad,
                  ]}
                  onPress={() => onLeft(m.id)}>
                  <Text
                    style={[
                      styles.chipText,
                      hintOk && answerFeedback.okText,
                      flashWrong === String(m.id) && answerFeedback.badText,
                    ]}>
                    {m.value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.col}>
            {remainingRight.map(m => {
              const hintOk =
                showCorrectHint &&
                selectedLeft !== undefined &&
                sameId(m.id, selectedLeft);
              return (
                <Pressable
                  key={`R-${m.id}`}
                  style={[
                    styles.chip,
                    styles.chipRight,
                    sameId(selectedRight, m.id) && styles.chipOn,
                    hintOk && styles.chipHint,
                  ]}
                  onPress={() => onRight(m.id)}>
                  <Text
                    style={[
                      styles.chipText,
                      hintOk && answerFeedback.okText,
                    ]}>
                    {m.correctValue}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      {incorrectedMatches.map(m => (
        <View key={`bad-${m.id}`} style={styles.pairRow}>
          <View style={[styles.chip, answerFeedback.chipBad, styles.pairChip]}>
            <Text style={[styles.chipText, answerFeedback.badText]}>
              {m.value}
            </Text>
          </View>
          <View style={[styles.chip, answerFeedback.chipBad, styles.pairChip]}>
            <Text style={[styles.chipText, answerFeedback.badText]}>
              {m.selectedValue}
            </Text>
          </View>
        </View>
      ))}
      {correctedMatches.map(m => (
        <View key={`ok-${m.id}`} style={styles.pairRow}>
          <View style={[styles.chip, answerFeedback.chipOk, styles.pairChip]}>
            <Text style={[styles.chipText, answerFeedback.okText]}>
              {m.value}
            </Text>
          </View>
          <View style={[styles.chip, answerFeedback.chipOk, styles.pairChip]}>
            <Text style={[styles.chipText, answerFeedback.okText]}>
              {m.correctValue}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  cols: {flexDirection: 'row', gap: 10},
  col: {flex: 1, gap: 8},
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipRight: {backgroundColor: '#F3F0FF'},
  chipOn: {borderColor: colors.primary, backgroundColor: '#DDD6FF'},
  chipHint: {
    backgroundColor: '#A7F3D0',
    borderColor: 'rgba(22,163,74,0.95)',
  },
  chipBad: {
    backgroundColor: '#FEE2E2',
    borderColor: 'rgba(220,38,38,0.75)',
  },
  pairRow: {flexDirection: 'row', gap: 10},
  pairChip: {flex: 1},
  chipText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
