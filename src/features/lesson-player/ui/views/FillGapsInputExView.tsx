import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {
  GapField,
  gapHtmlToPlainText,
  isCorrectOption,
  splitDataText,
} from './fillGapsLegacy';

type Props = {data: any};

export function FillGapsInputExView({data}: Props) {
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
  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    fields.forEach(f => {
      next[String(f.id)] = answers[String(f.id)]?.answer || '';
    });
    setLocal(next);
  }, [answers, fields]);

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
            const field = fieldsById.get(String(part.id));
            const val = local[String(part.id)] ?? '';
            const ok = isCorrectOption(field, val);
            return (
              <TextInput
                key={`g-${part.id}-${idx}`}
                style={[
                  styles.input,
                  ok && styles.inputOk,
                  !!val && !ok && styles.inputBad,
                ]}
                value={val}
                onChangeText={v =>
                  setLocal(prev => ({...prev, [String(part.id)]: v}))
                }
                onBlur={() => writeAnswer(part.id, local[String(part.id)] ?? '')}
                placeholder="..."
                placeholderTextColor={colors.muted}
              />
            );
          })}
        </View>
        {!parts.some(p => p.type === 'gap') &&
          fields.map(field => {
            const val = local[String(field.id)] ?? '';
            const ok = isCorrectOption(field, val);
            return (
              <TextInput
                key={String(field.id)}
                style={[
                  styles.input,
                  styles.inputBlock,
                  ok && styles.inputOk,
                  !!val && !ok && styles.inputBad,
                ]}
                value={val}
                onChangeText={v =>
                  setLocal(prev => ({...prev, [String(field.id)]: v}))
                }
                onBlur={() => writeAnswer(field.id, local[String(field.id)] ?? '')}
                placeholder={field.originalWord || '...'}
                placeholderTextColor={colors.muted}
              />
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 4,
    rowGap: 6,
  },
  textWrap: {flexGrow: 0, flexShrink: 1, maxWidth: '100%'},
  text: {fontSize: 16, color: colors.text, lineHeight: 24},
  input: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 64,
    maxWidth: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 16,
  },
  inputBlock: {width: '100%', marginTop: 4},
  inputOk: {backgroundColor: '#EBFFEE'},
  inputBad: {backgroundColor: '#FFE5E5'},
});
