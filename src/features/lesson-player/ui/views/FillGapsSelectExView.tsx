import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {OptionSelect} from '../interaction/OptionSelect';
import {GapField, gapHtmlToPlainText, splitDataText} from './fillGapsLegacy';

type Props = {data: any};

type LocalAnswer = {
  id: string | number;
  word: string;
  isCorrect: boolean;
};

export function FillGapsSelectExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const fields: GapField[] = data?.fields || [];
  const fieldsById = useMemo(() => {
    const m = new Map<string, GapField>();
    fields.forEach(f => m.set(String(f.id), f));
    return m;
  }, [fields]);

  const parts = useMemo(() => splitDataText(data?.dataText), [data?.dataText]);
  const [localAnswers, setLocalAnswers] = useState<LocalAnswer[]>([]);

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        setLocalAnswers([]);
        return;
      }
      setLocalAnswers(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

  const selectedFor = (id: string) =>
    [...localAnswers].reverse().find(a => String(a.id) === String(id));

  const pick = (field: GapField, word: string) => {
    const isCorrect = !!(field.options || []).find(
      o => o.value === word && o.isCorrect,
    );
    const next = localAnswers.concat({id: field.id, word, isCorrect});
    setLocalAnswers(next);
    writeAnswer(data.id, JSON.stringify(next));
  };

  const bgImages = data?.images?.length ? [data.images[0]] : [];

  const renderGap = (field: GapField | undefined, key: string) => {
    if (!field) {
      return null;
    }
    const sel = selectedFor(String(field.id));
    const options = (field.options || []).map((o, i) => ({
      id: `${field.id}-${i}-${o.value}`,
      label: o.value,
      isCorrect: !!o.isCorrect,
    }));
    return (
      <View key={key} style={styles.gapWrap}>
        <OptionSelect
          value={sel?.word}
          options={options}
          highlightCorrect={isTeacher}
          status={
            sel ? (sel.isCorrect ? 'ok' : 'bad') : 'neutral'
          }
          onChange={opt => pick(field, opt.label)}
        />
      </View>
    );
  };

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
      <View style={styles.card}>
        <View style={styles.flow}>
          {parts.map((part, idx) => {
            if (part.type === 'text') {
              const text = gapHtmlToPlainText(part.html);
              if (!text) {
                return null;
              }
              return (
                <View key={`t-${idx}`} style={styles.textWrap}>
                  <Text style={styles.text}>{text}</Text>
                </View>
              );
            }
            return renderGap(
              fieldsById.get(String(part.id)),
              `g-${part.id}-${idx}`,
            );
          })}
        </View>
        {!parts.some(p => p.type === 'gap') &&
          fields.map(f => renderGap(f, String(f.id)))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible', zIndex: 2},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
    overflow: 'visible',
    zIndex: 2,
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 4,
    rowGap: 6,
    overflow: 'visible',
    zIndex: 2,
  },
  textWrap: {flexGrow: 0, flexShrink: 1, maxWidth: '100%'},
  text: {fontSize: 16, color: colors.text, lineHeight: 24},
  gapWrap: {zIndex: 3, flexGrow: 0, flexShrink: 1, maxWidth: '100%'},
});
