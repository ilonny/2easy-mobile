import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {resetAnswers} from '../../api/lessonApi';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

type Option = {id: string; value: string; isCorrect?: boolean};
type Question = {id: string; value: string; options?: Option[]};

export function TestExView({data}: Props) {
  const {t} = useI18n();
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers, setAnswers, targetStudentId} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const questions: Question[] = data?.questions || [];
  const totalSteps = questions.length;
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const sessionCorrectRef = useRef<Record<string, boolean>>({});
  const hydratedRef = useRef(false);

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

  // Restore progress from saved step/score (student continue / teacher view).
  useEffect(() => {
    if (hydratedRef.current || !Object.keys(answers).length) {
      return;
    }
    const stepRaw = answers.step?.answer;
    const scoreRaw = answers.score?.answer;
    if (stepRaw == null && scoreRaw == null) {
      return;
    }
    hydratedRef.current = true;
    const step = Number(stepRaw);
    const savedScore = Number(scoreRaw);
    if (Number.isFinite(step) && step >= 0) {
      if (totalSteps > 0 && step >= totalSteps) {
        setFinished(true);
        setIndex(Math.max(0, totalSteps - 1));
      } else {
        setIndex(step);
        setFinished(false);
      }
    }
    if (Number.isFinite(savedScore) && savedScore >= 0) {
      setScore(savedScore);
    }
  }, [answers, totalSteps]);

  useEffect(() => {
    if (finished) {
      return;
    }
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
  }, [question?.id, parsed, finished]);

  const persistMeta = useCallback(
    (nextIndex: number, nextScore: number) => {
      void writeAnswer('step', String(nextIndex));
      void writeAnswer('score', String(nextScore));
    },
    [writeAnswer],
  );

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
    const wasCorrect = Object.keys(nextError).length === 0;
    sessionCorrectRef.current[String(question.id)] = wasCorrect;
    let nextScore = score;
    if (wasCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
    }
    void writeAnswer(
      question.id,
      JSON.stringify({errorMap: nextError, selectedMap}),
    );
    persistMeta(index, nextScore);
  };

  const onNext = () => {
    const next = index + 1;
    if (next >= totalSteps) {
      setFinished(true);
      persistMeta(totalSteps, score);
      return;
    }
    setIndex(next);
    persistMeta(next, score);
  };

  const onBack = () => {
    if (index <= 0) {
      return;
    }
    const prevIndex = index - 1;
    const prevQ = questions[prevIndex];
    if (prevQ) {
      const qid = String(prevQ.id);
      if (sessionCorrectRef.current[qid]) {
        setScore(s => {
          const next = Math.max(0, s - 1);
          persistMeta(prevIndex, next);
          return next;
        });
      } else {
        persistMeta(prevIndex, score);
      }
      delete sessionCorrectRef.current[qid];
      void writeAnswer(prevQ.id, '');
      setAnswers(prev => {
        const next = {...prev};
        delete next[qid];
        return next;
      });
    }
    setFinished(false);
    setIndex(prevIndex);
  };

  const onRestart = async () => {
    setRestarting(true);
    try {
      if (targetStudentId > 0 && lessonId > 0 && data?.id) {
        await resetAnswers({
          lesson_id: lessonId,
          ex_id: Number(data.id),
          student_id: targetStudentId,
        });
      }
      setAnswers({});
      sessionCorrectRef.current = {};
      hydratedRef.current = true;
      setScore(0);
      setIndex(0);
      setFinished(false);
      setSelectedMap({});
      setErrorMap({});
      setSubmitted(false);
      persistMeta(0, 0);
    } finally {
      setRestarting(false);
    }
  };

  if (!totalSteps) {
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

  if (finished) {
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
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{t('testEx.yourScore')}</Text>
          <Text style={styles.resultScore}>
            {score}/{totalSteps}
          </Text>
          <Pressable
            style={[styles.btn, restarting && styles.btnDisabled]}
            disabled={restarting}
            onPress={() => {
              void onRestart();
            }}>
            <Text style={styles.btnText}>{t('testEx.restart')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!question) {
    return null;
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
      <View style={styles.card}>
        {!!question.value && (
          <HtmlContent html={question.value} baseStyle={styles.q} />
        )}
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
            } else if (
              isCorrect ||
              (submitted && option.isCorrect && !isSelected)
            ) {
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
                style={[
                  styles.option,
                  {backgroundColor: bg, borderColor: border},
                ]}
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
                    isSelected &&
                      !submitted &&
                      !teacherHint &&
                      styles.optionTextOn,
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
            <Text style={styles.btnText}>{t('testEx.check')}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={onNext}>
            <Text style={styles.btnText}>
              {index < totalSteps - 1
                ? `${t('lessons.next')} →`
                : t('testEx.showResult')}
            </Text>
          </Pressable>
        )}

        <View style={styles.footer}>
          <View style={styles.footerSide}>
            {index > 0 ? (
              <Pressable onPress={onBack} hitSlop={8}>
                <Text style={styles.footerLink}>{t('common.back')}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.progress}>
            {index + 1}/{totalSteps}
          </Text>
          <View style={styles.footerSide} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  resultScore: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 12,
  },
  progress: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
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
    alignSelf: 'stretch',
  },
  btnDisabled: {opacity: 0.45},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  footerSide: {width: 72},
  footerLink: {color: colors.muted, fontSize: 13, fontWeight: '600'},
});
