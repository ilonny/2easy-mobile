import {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

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

export function MatchWordWordExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
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

  const rightOrder = useMemo(
    () => shuffle(matches.map(m => m.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.id],
  );

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) return;
      const parsed = JSON.parse(raw);
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
    const left = matches.find(m => m.id === leftId);
    const right = matches.find(m => m.id === rightId);
    if (!left || !right) return;

    if (leftId === rightId) {
      const next = correctIds.includes(leftId)
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
    if (correctIds.includes(id)) return;
    if (selectedRight !== undefined) {
      tryMatch(id, selectedRight);
      return;
    }
    setSelectedLeft(id);
  };

  const onRight = (id: string | number) => {
    if (correctIds.includes(id)) return;
    if (selectedLeft !== undefined) {
      tryMatch(selectedLeft, id);
      return;
    }
    setSelectedRight(id);
  };

  const remainingLeft = matches.filter(m => !correctIds.includes(m.id));
  const remainingRight = rightOrder
    .map(id => matches.find(m => m.id === id))
    .filter((m): m is Match => !!m && !correctIds.includes(m.id));

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
      <View style={styles.cols}>
        <View style={styles.col}>
          {remainingLeft.map(m => (
            <Pressable
              key={`L-${m.id}`}
              style={[
                styles.chip,
                selectedLeft === m.id && styles.chipOn,
                flashWrong === String(m.id) && styles.chipBad,
              ]}
              onPress={() => onLeft(m.id)}>
              <Text style={styles.chipText}>{m.value}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.col}>
          {remainingRight.map(m => (
            <Pressable
              key={`R-${m.id}`}
              style={[
                styles.chip,
                styles.chipRight,
                selectedRight === m.id && styles.chipOn,
              ]}
              onPress={() => onRight(m.id)}>
              <Text style={styles.chipText}>{m.correctValue}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {!!correctIds.length && (
        <View style={styles.doneBox}>
          {matches
            .filter(m => correctIds.includes(m.id))
            .map(m => (
              <Text key={`ok-${m.id}`} style={styles.doneText}>
                {m.value} → {m.correctValue}
              </Text>
            ))}
        </View>
      )}
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
  chipBad: {backgroundColor: '#FFE5E5', borderColor: colors.danger},
  chipText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  doneBox: {
    backgroundColor: '#EBFFEE',
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
  },
  doneText: {color: '#166534', fontWeight: '600'},
});
