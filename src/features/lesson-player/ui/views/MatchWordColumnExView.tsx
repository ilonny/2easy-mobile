import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {StickyChipPool} from '../interaction/StickyChipPool';

type Props = {data: any};

type SortedWord = {word: string; id: string; columnId: string | number};
type Column = {id: string | number; title?: string; words?: string[]};

export function MatchWordColumnExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });
  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();

  const columns: Column[] = data?.columns || [];
  const [correctChips, setCorrectChips] = useState<SortedWord[]>([]);
  const [incorrectIdsMap, setIncorrectIdsMap] = useState<
    Record<string, string[]>
  >({});
  const [selected, setSelected] = useState<SortedWord | null>(null);
  const [flashCol, setFlashCol] = useState<string>();

  const allWords = useMemo(() => {
    const list: SortedWord[] = [];
    columns.forEach(col => {
      (col.words || []).forEach((word, wordIndex) => {
        if (!word) {
          return;
        }
        list.push({
          word,
          id: `${col.id}__${wordIndex}__${word}`,
          columnId: col.id,
        });
      });
    });
    return list;
  }, [columns]);

  const pool = useMemo(
    () =>
      allWords.filter(
        w => !correctChips.some(c => c.id === w.id || c.word === w.word),
      ),
    [allWords, correctChips],
  );

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      setCorrectChips(parsed?.correctIds || []);
      setIncorrectIdsMap(parsed?.incorrectIdsMap || {});
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

  const persist = (
    nextCorrect: SortedWord[],
    nextIncorrect: Record<string, string[]>,
  ) => {
    writeAnswer(
      data.id,
      JSON.stringify({correctIds: nextCorrect, incorrectIdsMap: nextIncorrect}),
    );
  };

  const placeOnColumn = (columnId: string | number, chip: SortedWord) => {
    if (String(chip.columnId) === String(columnId)) {
      const next = correctChips.some(c => c.id === chip.id)
        ? correctChips
        : correctChips.concat(chip);
      setCorrectChips(next);
      persist(next, incorrectIdsMap);
      setSelected(null);
      return true;
    }
    const key = String(columnId);
    const missed = [...(incorrectIdsMap[key] || [])];
    if (!missed.includes(chip.word)) {
      missed.push(chip.word);
    }
    const nextIncorrect = {...incorrectIdsMap, [key]: missed};
    setIncorrectIdsMap(nextIncorrect);
    setFlashCol(key);
    setTimeout(() => setFlashCol(undefined), 1200);
    persist(correctChips, nextIncorrect);
    setSelected(null);
    return false;
  };

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
      {!!pool.length && (
        <StickyChipPool>
          {pool.map(chip => (
            <DraggableChip
              key={chip.id}
              id={chip.id}
              label={chip.word}
              selected={selected?.id === chip.id}
              onSelect={() => setSelected(chip)}
              hitTestDropTarget={hitTestDropTarget}
              onDropOnTarget={targetId => placeOnColumn(targetId, chip)}
            />
          ))}
        </StickyChipPool>
      )}
      <View style={styles.columns}>
        {columns.map(col => {
          const placed = correctChips.filter(
            c => String(c.columnId) === String(col.id),
          );
          return (
            <DropZone
              key={String(col.id)}
              id={String(col.id)}
              registerRef={registerRef}
              highlight={!!selected}
              style={[
                styles.column,
                flashCol === String(col.id) && styles.columnBad,
                selected && styles.columnActive,
              ]}>
              <Text
                style={styles.colTitle}
                onPress={() => {
                  if (selected) {
                    placeOnColumn(col.id, selected);
                  }
                }}>
                {col.title || 'Column'}
              </Text>
              {placed.map(p => (
                <Text key={p.id} style={styles.placed}>
                  {p.word}
                </Text>
              ))}
              {!placed.length && (
                <Text
                  style={styles.hint}
                  onPress={() => {
                    if (selected) {
                      placeOnColumn(col.id, selected);
                    }
                  }}>
                  {selected ? '⬇' : ' '}
                </Text>
              )}
            </DropZone>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible'},
  columns: {gap: 10},
  column: {
    minHeight: 90,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  columnActive: {borderColor: colors.primary},
  columnBad: {backgroundColor: '#FFE5E5', borderColor: colors.danger},
  colTitle: {
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  placed: {
    textAlign: 'center',
    color: '#166534',
    fontWeight: '600',
    backgroundColor: '#EBFFEE',
    borderRadius: 8,
    paddingVertical: 6,
    overflow: 'visible',
  },
  hint: {textAlign: 'center', color: colors.textSecondary},
});
