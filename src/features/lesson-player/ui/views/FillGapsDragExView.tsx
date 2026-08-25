import {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {StickyChipPool} from '../interaction/StickyChipPool';
import {answerFeedback} from '../interaction/answerFeedback';
import {GapField, splitDataText} from './fillGapsLegacy';

type Props = {data: any};

export function FillGapsDragExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });
  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();
  const scopeRef = useRef<View>(null);

  const fields: GapField[] = data?.fields || [];
  const fieldsById = useMemo(() => {
    const m = new Map<string, GapField>();
    fields.forEach(f => m.set(String(f.id), f));
    return m;
  }, [fields]);

  const parts = useMemo(() => splitDataText(data?.dataText), [data?.dataText]);
  const [correctIds, setCorrectIds] = useState<Array<string | number>>([]);
  const [incorrectIdsMap, setIncorrectIdsMap] = useState<Record<string, string>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | number>();
  const [flashBad, setFlashBad] = useState<string>();

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      setCorrectIds(parsed?.correctIds || []);
      setIncorrectIdsMap(parsed?.incorrectIdsMap || {});
    } catch {
      // ignore
    }
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

  const chipValue = (f: GapField) =>
    f.value || f.options?.find(o => o.isCorrect)?.value || f.originalWord || '';

  const pool = fields.filter(
    f => !correctIds.map(String).includes(String(f.id)),
  );

  const tryPlace = (gapId: string | number, chipId: string | number) => {
    if (correctIds.map(String).includes(String(gapId))) {
      return false;
    }
    const chip = fieldsById.get(String(chipId));
    const target = fieldsById.get(String(gapId));
    if (!chip || !target) {
      return false;
    }
    const chipText = chipValue(chip);
    const targetText = chipValue(target);
    if (
      String(chip.id) === String(target.id) ||
      chipText.toLowerCase() === targetText.toLowerCase()
    ) {
      const next = correctIds.concat(gapId);
      setCorrectIds(next);
      persist(next, incorrectIdsMap);
      setSelectedId(undefined);
      return true;
    }
    const nextIncorrect = {...incorrectIdsMap, [String(gapId)]: chipText};
    setIncorrectIdsMap(nextIncorrect);
    setFlashBad(String(gapId));
    setTimeout(() => setFlashBad(undefined), 1000);
    persist(correctIds, nextIncorrect);
    setSelectedId(undefined);
    return false;
  };

  const renderGap = (field: GapField | undefined, key: string) => {
    if (!field) {
      return null;
    }
    const done = correctIds.map(String).includes(String(field.id));
    const wrong = incorrectIdsMap[String(field.id)];
    const showWrong = !done && !!wrong;
    return (
      <DropZone
        key={key}
        id={String(field.id)}
        registerRef={registerRef}
        highlight={selectedId != null && !done}
        style={[
          styles.gap,
          answerFeedback.slot,
          done && answerFeedback.ok,
          (flashBad === String(field.id) || showWrong) && answerFeedback.bad,
        ]}>
        <Text
          onPress={() => {
            if (done) {
              return;
            }
            if (selectedId != null) {
              tryPlace(field.id, selectedId);
            }
          }}
          style={[
            styles.gapText,
            done && answerFeedback.okText,
            showWrong && answerFeedback.badText,
          ]}>
          {done ? chipValue(field) : wrong || '····'}
        </Text>
      </DropZone>
    );
  };

  const bgImages = data?.images?.length ? [data.images[0]] : [];

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
      {!!pool.length && (
        <StickyChipPool scopeRef={scopeRef}>
          {pool.map(f => (
            <DraggableChip
              key={String(f.id)}
              id={String(f.id)}
              label={chipValue(f)}
              selected={selectedId === f.id}
              onSelect={() => setSelectedId(f.id)}
              hitTestDropTarget={hitTestDropTarget}
              onDropOnTarget={(targetId, chipId) => tryPlace(targetId, chipId)}
            />
          ))}
        </StickyChipPool>
      )}
      <View style={styles.card}>
        <View style={styles.flow}>
          {parts.map((part, idx) => {
            if (part.type === 'text') {
              return <HtmlContent key={`t-${idx}`} html={part.html} />;
            }
            return renderGap(
              fieldsById.get(String(part.id)),
              `g-${part.id}-${idx}`,
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible'},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    overflow: 'visible',
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  gap: {
    minWidth: 120,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapText: {color: colors.primary, fontWeight: '700'},
});
