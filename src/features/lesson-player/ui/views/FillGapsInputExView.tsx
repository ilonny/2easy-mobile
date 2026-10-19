import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {useGapSizes} from '../interaction/gapSizes';
import {TeacherAnswerHint} from '../interaction/TeacherAnswerHint';
import {
  GapField,
  gapHtmlToPlainText,
  isCorrectOption,
  splitDataText,
} from './fillGapsLegacy';

type Props = {data: any};

function fieldHint(field?: GapField): string {
  if (!field) {
    return '';
  }
  const marked = (field.options || [])
    .filter(o => o.isCorrect)
    .map(o => (o.value || '').trim())
    .filter(Boolean);
  if (marked.length) {
    return Array.from(new Set(marked)).join(', ');
  }
  return (field.value || field.originalWord || '').trim();
}

export function FillGapsInputExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const gapSizes = useGapSizes();
  const {writeAnswer, answers, resetSeq} = useExAnswer({
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
  const localRef = useRef(local);
  localRef.current = local;
  const focusedIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const hydratedSigRef = useRef('');

  const answersSig = useMemo(() => {
    return fields
      .map(f => `${f.id}:${answers[String(f.id)]?.answer ?? ''}`)
      .join('|');
  }, [answers, fields]);

  // Hydrate from server only when not editing locally
  useEffect(() => {
    if (focusedIdRef.current || dirtyRef.current) {
      return;
    }
    if (hydratedSigRef.current === `${resetSeq}:${answersSig}`) {
      return;
    }
    hydratedSigRef.current = `${resetSeq}:${answersSig}`;
    const next: Record<string, string> = {};
    fields.forEach(f => {
      next[String(f.id)] = answers[String(f.id)]?.answer || '';
    });
    setLocal(next);
  }, [answers, answersSig, fields, resetSeq]);

  useEffect(() => {
    dirtyRef.current = false;
    focusedIdRef.current = null;
    hydratedSigRef.current = '';
    setLocal({});
  }, [resetSeq]);

  const onChangeGap = useCallback((id: string, v: string) => {
    dirtyRef.current = true;
    setLocal(prev => {
      const next = {...prev, [id]: v};
      localRef.current = next;
      return next;
    });
  }, []);

  const onBlurGap = useCallback(
    (id: string) => {
      focusedIdRef.current = null;
      const value = localRef.current[id] ?? '';
      void writeAnswer(id, value);
      dirtyRef.current = false;
    },
    [writeAnswer],
  );

  const bgImages = data?.images?.length ? [data.images[0]] : [];

  const renderInput = (field: GapField | undefined, id: string, key: string) => {
    const val = local[id] ?? '';
    const ok = isCorrectOption(field, val);
    const hint = fieldHint(field);
    const teacherHintsOn = !!isTeacher && !!hint;
    return (
      <TeacherAnswerHint key={key} enabled={teacherHintsOn} hint={hint}>
        <TextInput
          style={[
            styles.input,
            {
              minWidth: gapSizes.inputMinWidth,
              minHeight: gapSizes.gapMinHeight,
            },
            ok && styles.inputOk,
            !!val && !ok && styles.inputBad,
          ]}
          value={val}
          onFocus={() => {
            focusedIdRef.current = id;
          }}
          onChangeText={v => onChangeGap(id, v)}
          onBlur={() => onBlurGap(id)}
          placeholder="..."
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </TeacherAnswerHint>
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
            const field = fieldsById.get(String(part.id));
            const id = String(part.id);
            return renderInput(field, id, `g-${part.id}-${idx}`);
          })}
        </View>
        {!parts.some(p => p.type === 'gap') &&
          fields.map(field => {
            const id = String(field.id);
            return renderInput(field, id, id);
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
    columnGap: 6,
    rowGap: 8,
  },
  textWrap: {flexGrow: 0, flexShrink: 1, maxWidth: '100%'},
  text: {fontSize: 16, color: colors.text, lineHeight: 24},
  input: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 16,
  },
  inputOk: {backgroundColor: '#EBFFEE'},
  inputBad: {backgroundColor: '#FFE5E5'},
});
