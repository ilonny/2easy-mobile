import {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
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
  });

  const questions: Question[] = data?.questions || [];
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    (data?.questions || []).forEach((q: Question) => {
      next[String(q.id)] = answers[String(q.id)]?.answer || '';
    });
    setLocal(next);
  }, [answers, data?.questions]);

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
              <Text style={styles.prompt}>{question.value}</Text>
            )}
            <TextInput
              style={styles.input}
              multiline
              textAlignVertical="top"
              value={local[key] ?? ''}
              onChangeText={val =>
                setLocal(prev => ({...prev, [key]: val}))
              }
              onBlur={() => writeAnswer(question.id, local[key] ?? '')}
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
