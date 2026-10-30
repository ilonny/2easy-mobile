import {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {RichHtmlEditor} from '../../../lesson-editor/ui/editors/RichHtmlEditor';
import {useI18n} from '../../../../shared/i18n';
import {colors} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

type Question = {id: string | number; value?: string};

export function FreeInputFormExView({data}: Props) {
  const {t} = useI18n();
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
  const localRef = useRef(local);
  localRef.current = local;
  const writeAnswerRef = useRef(writeAnswer);
  writeAnswerRef.current = writeAnswer;

  // Teachers get a formatting toolbar when correcting a selected student's work
  // (same as the site FreeInputAnswerEditor).
  const showToolbar = isTeacher && !!activeStudentId;

  useEffect(() => {
    const next: Record<string, string> = {};
    (data?.questions || []).forEach((q: Question) => {
      const key = String(q.id);
      // Don't overwrite the field the student is currently editing.
      if (focusedKeyRef.current === key) {
        next[key] = localRef.current[key] ?? answers[key]?.answer ?? '';
        return;
      }
      next[key] = answers[key]?.answer || '';
    });
    setLocal(next);
  }, [answers, data?.questions]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.keys(timers).forEach(key => {
        clearTimeout(timers[key]);
        void writeAnswerRef.current(key, localRef.current[key] ?? '');
      });
    };
  }, []);

  const scheduleSave = (questionId: string | number, value: string) => {
    const key = String(questionId);
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }
    saveTimers.current[key] = setTimeout(() => {
      delete saveTimers.current[key];
      void writeAnswer(questionId, localRef.current[key] ?? value);
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
            <RichHtmlEditor
              html={local[key] ?? ''}
              minHeight={100}
              showToolbar={showToolbar}
              placeholder={t('editor.answerPlaceholder')}
              onFocus={() => {
                focusedKeyRef.current = key;
              }}
              onChangeHtml={val => {
                setLocal(prev => ({...prev, [key]: val}));
                scheduleSave(question.id, val);
              }}
              onBlur={() => {
                focusedKeyRef.current = null;
                if (saveTimers.current[key]) {
                  clearTimeout(saveTimers.current[key]);
                  delete saveTimers.current[key];
                }
                void writeAnswerRef.current(
                  question.id,
                  localRef.current[key] ?? '',
                );
              }}
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
});
