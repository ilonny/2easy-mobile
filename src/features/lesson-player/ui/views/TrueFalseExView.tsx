import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {isTrueFalseSentenceValid} from '../../../lesson-editor/ui/editors/trueFalseTypes';
import type {TrueFalseSentence} from '../../../lesson-editor/ui/editors/trueFalseTypes';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {answerFeedback} from '../interaction/answerFeedback';

type Props = {data: any};

type AnswerStatus = 'correct' | 'incorrect' | 'neutral';
type AnswersMap = Record<
  string,
  {value?: boolean; status?: AnswerStatus}
>;

export function TrueFalseExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers, resetSeq} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const sentences: TrueFalseSentence[] = useMemo(
    () =>
      ((data?.sentences as TrueFalseSentence[]) || []).filter(s =>
        isTrueFalseSentenceValid(s),
      ),
    [data?.sentences],
  );

  const sentencesById = useMemo(() => {
    const m = new Map<string, TrueFalseSentence>();
    sentences.forEach(s => m.set(s.id, s));
    return m;
  }, [sentences]);

  const [map, setMap] = useState<AnswersMap>({});
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMap({});
  }, [resetSeq]);

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        setMap({});
        return;
      }
      const parsedRaw = JSON.parse(raw);
      const parsed: AnswersMap = {};
      Object.keys(parsedRaw || {}).forEach(k => {
        const v = parsedRaw[k];
        if (v && typeof v === 'object') {
          parsed[k] = {
            value: typeof v.value === 'boolean' ? v.value : undefined,
            status: v.status,
          };
        }
      });
      setMap(parsed);
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    (next: AnswersMap) => {
      if (isTeacher) {
        return;
      }
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        void writeAnswer(data.id, JSON.stringify(next));
      }, 400);
    },
    [data.id, writeAnswer, isTeacher],
  );

  const onChoose = (sentenceId: string, value: boolean) => {
    const sentence = sentencesById.get(sentenceId);
    if (!sentence) {
      return;
    }
    if (map[sentenceId]?.status === 'correct') {
      return;
    }
    const ok = sentence.answer === value;
    const next: AnswersMap = {
      ...map,
      [sentenceId]: {
        value,
        status: ok ? 'correct' : 'incorrect',
      },
    };
    setMap(next);
    persist(next);
  };

  const choiceStyle = (sentenceId: string, option: boolean) => {
    const selected = map[sentenceId]?.value;
    const status = map[sentenceId]?.status || 'neutral';
    const isSelected = selected === option;
    if (status === 'correct' && isSelected) {
      return [styles.choiceBtn, answerFeedback.ok];
    }
    if (status === 'incorrect' && isSelected) {
      return [styles.choiceBtn, answerFeedback.bad];
    }
    if (isSelected) {
      return [styles.choiceBtn, styles.choiceSelected];
    }
    if (isTeacher && sentencesById.get(sentenceId)?.answer === option) {
      return [styles.choiceBtn, styles.choiceHint];
    }
    return [styles.choiceBtn];
  };

  const choiceTextStyle = (sentenceId: string, option: boolean) => {
    const selected = map[sentenceId]?.value;
    const status = map[sentenceId]?.status || 'neutral';
    const isSelected = selected === option;
    if (status === 'correct' && isSelected) {
      return answerFeedback.okText;
    }
    if (status === 'incorrect' && isSelected) {
      return answerFeedback.badText;
    }
    if (isSelected) {
      return styles.choiceSelectedText;
    }
    return styles.choiceText;
  };

  const images = data?.images?.length ? [data.images[0]] : [];

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!images.length && <ImageGallery images={images} />}
      <View style={styles.card}>
        {sentences.map(sentence => (
          <View key={sentence.id} style={styles.sentenceBlock}>
            <Text style={styles.sentenceText}>{sentence.text}</Text>
            <View style={styles.buttons}>
              <Pressable
                style={choiceStyle(sentence.id, true)}
                onPress={() => onChoose(sentence.id, true)}>
                <Text style={choiceTextStyle(sentence.id, true)}>True</Text>
              </Pressable>
              <Pressable
                style={choiceStyle(sentence.id, false)}
                onPress={() => onChoose(sentence.id, false)}>
                <Text style={choiceTextStyle(sentence.id, false)}>False</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 16,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.12)',
    gap: 16,
  },
  sentenceBlock: {
    gap: 10,
  },
  sentenceText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceHint: {
    borderColor: 'rgba(22, 163, 74, 0.7)',
    borderWidth: 2,
  },
  choiceText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.primary,
  },
  choiceSelectedText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.white,
  },
});
