import {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

type Option = {id: string; value: string; isCorrect?: boolean};
type Question = {id: string; value: string; options?: Option[]};

export function TestExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const questions: Question[] = data?.questions || [];
  const [index, setIndex] = useState(0);
  const question = questions[index];
  const isSingle =
    (question?.options || []).filter(o => o.isCorrect).length === 1;

  const saved = answers[String(question?.id)]?.answer;
  const parsed = useMemo(() => {
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [saved]);

  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [peekCorrect, setPeekCorrect] = useState(false);

  useEffect(() => {
    if (parsed) {
      setSelectedMap(parsed.selectedMap || {});
      setErrorMap(parsed.errorMap || {});
      setSubmitted(true);
    } else {
      setSelectedMap({});
      setErrorMap({});
      setSubmitted(false);
    }
    setPeekCorrect(false);
  }, [question?.id, parsed]);

  const bgImages = data?.images?.length ? [data.images[0]] : [];

  const toggle = (optionId: string) => {
    if (submitted) {
      return;
    }
    setSelectedMap(prev => {
      if (isSingle) {
        return {[optionId]: true};
      }
      const next = {...prev};
      if (next[optionId]) {
        delete next[optionId];
      } else {
        next[optionId] = true;
      }
      return next;
    });
  };

  const onSubmit = () => {
    if (!question) {
      return;
    }
    const nextError: Record<string, boolean> = {};
    (question.options || []).forEach(option => {
      if (option.isCorrect && !selectedMap[option.id]) {
        nextError[option.id] = true;
      }
      if (!option.isCorrect && selectedMap[option.id]) {
        nextError[option.id] = true;
      }
    });
    setErrorMap(nextError);
    setSubmitted(true);
    setPeekCorrect(false);
    writeAnswer(
      question.id,
      JSON.stringify({errorMap: nextError, selectedMap}),
    );
  };

  if (!question) {
    return (
      <View style={styles.root}>
        <ExHeader
          title={data?.title}
          titleColor={data?.titleColor}
          subtitle={data?.subtitle}
          description={data?.description}
        />
      </View>
    );
  }

  const showTeacherPeek = isTeacher && peekCorrect && !submitted;

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
      <Text style={styles.progress}>
        {index + 1} / {questions.length}
      </Text>
      <Text style={styles.q}>{question.value}</Text>
      <View
        style={styles.options}
        onTouchStart={() => {
          if (isTeacher && !submitted) {
            setPeekCorrect(true);
          }
        }}
        onTouchEnd={() => setPeekCorrect(false)}
        onTouchCancel={() => setPeekCorrect(false)}>
        {(question.options || []).map(option => {
          const isSelected = !!selectedMap[option.id];
          const isError = !!errorMap[option.id];
          const isCorrect = submitted && isSelected && !isError;
          const isIncorrect = submitted && isSelected && isError;
          const isMissed =
            submitted && option.isCorrect && !selectedMap[option.id];
          const teacherHint = showTeacherPeek && !!option.isCorrect;

          let bg: string = colors.primarySoft;
          let border: string = colors.primary;
          if (teacherHint) {
            bg = '#EBFFEE';
            border = '#22C55E';
          } else if (isCorrect || (submitted && option.isCorrect && !isSelected)) {
            bg = '#EBFFEE';
            border = '#22C55E';
          } else if (isIncorrect || isMissed) {
            bg = '#FFE5E5';
            border = colors.danger;
          } else if (isSelected) {
            bg = colors.primary;
            border = colors.primary;
          }

          return (
            <Pressable
              key={option.id}
              style={[styles.option, {backgroundColor: bg, borderColor: border}]}
              onPress={() => toggle(option.id)}>
              <View
                style={[
                  isSingle ? styles.radio : styles.check,
                  (isSelected || teacherHint) && styles.markOn,
                  teacherHint && styles.markOk,
                ]}
              />
              <Text
                style={[
                  styles.optionText,
                  isSelected && !submitted && !teacherHint && styles.optionTextOn,
                  teacherHint && styles.optionTextOk,
                ]}>
                {option.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!submitted ? (
        <Pressable
          style={[
            styles.btn,
            !Object.keys(selectedMap).length && styles.btnDisabled,
          ]}
          disabled={!Object.keys(selectedMap).length}
          onPress={onSubmit}>
          <Text style={styles.btnText}>Check</Text>
        </Pressable>
      ) : index < questions.length - 1 ? (
        <Pressable style={styles.btn} onPress={() => setIndex(i => i + 1)}>
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
      ) : (
        <Text style={styles.done}>Done</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  progress: {textAlign: 'center', color: colors.textSecondary, fontWeight: '600'},
  q: {fontSize: 18, fontWeight: '700', color: colors.text},
  options: {gap: 10},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  markOn: {backgroundColor: colors.primary},
  markOk: {backgroundColor: '#22C55E', borderColor: '#22C55E'},
  optionText: {flex: 1, fontSize: 16, color: colors.text},
  optionTextOn: {color: colors.white, fontWeight: '600'},
  optionTextOk: {color: '#166534', fontWeight: '700'},
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.45},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  done: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
  },
});
