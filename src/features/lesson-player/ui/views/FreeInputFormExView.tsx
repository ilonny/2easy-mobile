import {useEffect, useRef, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

type Question = {id: string | number; value?: string};

export function FreeInputFormExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
    // Live teacher corrections while student is not focused on the field.
    syncRemoteToStudent: true,
  });

  const questions: Question[] = data?.questions || [];
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const [local, setLocal] = useState<Record<string, string>>({});
  const focusedKeyRef = useRef<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    (data?.questions || []).forEach((q: Question) => {
      const key = String(q.id);
      // Don't overwrite the field the student is currently editing.
      if (focusedKeyRef.current === key) {
        next[key] = local[key] ?? answers[key]?.answer ?? '';
        return;
      }
      next[key] = answers[key]?.answer || '';
    });
    setLocal(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync from remote answers
  }, [answers, data?.questions]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const scheduleSave = (questionId: string | number, value: string) => {
    const key = String(questionId);
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }
    saveTimers.current[key] = setTimeout(() => {
      void writeAnswer(questionId, value);
    }, 500);
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
      {questions.map(question => {
        const key = String(question.id);
        return (
          <View key={key} style={styles.block}>
            {!!question.value && (
              <HtmlContent html={question.value} baseStyle={styles.prompt} />
            )}
            <TextInput
              style={styles.input}
              multiline
              textAlignVertical="top"
              value={local[key] ?? ''}
              onFocus={() => {
                focusedKeyRef.current = key;
              }}
              onChangeText={val => {
                setLocal(prev => ({...prev, [key]: val}));
                scheduleSave(question.id, val);
              }}
              onBlur={() => {
                focusedKeyRef.current = null;
                if (saveTimers.current[key]) {
                  clearTimeout(saveTimers.current[key]);
                  delete saveTimers.current[key];
                }
                void writeAnswer(question.id, local[key] ?? '');
              }}
              placeholder="Your answer..."
              placeholderTextColor={colors.muted}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 16},
  block: {gap: 8},
  prompt: {fontSize: 16, fontWeight: '600', color: colors.text},
  input: {
    minHeight: 100,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
});
