import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {Button} from '../../../shared/ui';
import type {DictionaryItem} from '../api/dictionaryApi';
import {
  answersMatch,
  buildQuizOptions,
  shuffleArray,
  type TrainingMode,
} from '../lib/training';
import {TrainingWordPicker} from './TrainingWordPicker';

type Props = {
  words: DictionaryItem[];
  allWords: DictionaryItem[];
};

const MODES: TrainingMode[] = ['cards', 'quizOptions', 'quizInput'];

type Step = 'modes' | 'words' | 'session';

export function TrainingPanel({words, allWords}: Props) {
  const {t} = useI18n();
  const [step, setStep] = useState<Step>('modes');
  const [mode, setMode] = useState<TrainingMode | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sessionWords, setSessionWords] = useState<DictionaryItem[]>([]);

  useEffect(() => {
    setSelectedIds(prev =>
      prev.filter(id => words.some(item => item.id === id)),
    );
  }, [words]);

  const handleSelectMode = useCallback((nextMode: TrainingMode) => {
    setMode(nextMode);
    setSelectedIds([]);
    setStep('words');
  }, []);

  const handleBackToModes = useCallback(() => {
    setStep('modes');
    setMode(null);
    setSelectedIds([]);
  }, []);

  const toggleItem = useCallback((id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      const allSelected =
        words.length > 0 && words.every(item => prev.includes(item.id));
      return allSelected ? [] : words.map(item => item.id);
    });
  }, [words]);

  const toggleGroup = useCallback((ids: number[], select: boolean) => {
    setSelectedIds(prev => {
      if (select) {
        return Array.from(new Set([...prev, ...ids]));
      }
      const remove = new Set(ids);
      return prev.filter(id => !remove.has(id));
    });
  }, []);

  const handleStart = useCallback(() => {
    if (!mode || !selectedIds.length) {
      return;
    }
    const selectedSet = new Set(selectedIds);
    const next = words.filter(item => selectedSet.has(item.id));
    if (!next.length) {
      return;
    }
    setSessionWords(next);
    setStep('session');
  }, [mode, selectedIds, words]);

  const handleSessionClose = useCallback(() => {
    setSessionWords([]);
    setStep('words');
  }, []);

  if (!words.length) {
    return (
      <Text style={styles.empty}>{t('dictionary.training.emptyUnlearned')}</Text>
    );
  }

  if (step === 'modes') {
    return (
      <ScrollView contentContainerStyle={styles.modes}>
        <Text style={styles.choose}>{t('dictionary.training.chooseMode')}</Text>
        {MODES.map(key => (
          <Pressable
            key={key}
            onPress={() => handleSelectMode(key)}
            style={styles.modeCard}>
            <Text style={styles.modeTitle}>
              {t(`dictionary.training.mode${capitalize(key)}`)}
            </Text>
            <Text style={styles.modeDesc}>
              {t(`dictionary.training.mode${capitalize(key)}Description`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (step === 'words') {
    return (
      <View style={styles.wordsStep}>
        <View style={styles.wordsHeader}>
          <Pressable onPress={handleBackToModes} style={styles.back}>
            <Text style={styles.backText}>
              ← {t('dictionary.training.backToModes')}
            </Text>
          </Pressable>
          {mode ? (
            <Text style={styles.modeHint}>
              {t(`dictionary.training.mode${capitalize(mode)}`)}
            </Text>
          ) : null}
        </View>
        <TrainingWordPicker
          items={words}
          selectedIds={selectedIds}
          onToggle={toggleItem}
          onToggleAll={toggleAll}
          onToggleGroup={toggleGroup}
        />
        <View style={styles.footer}>
          <Button
            title={t('dictionary.resetSelection')}
            variant="secondary"
            disabled={!selectedIds.length}
            onPress={() => setSelectedIds([])}
            style={styles.footerBtn}
          />
          <Button
            title={t('dictionary.training.start')}
            disabled={!selectedIds.length || !mode}
            onPress={handleStart}
            style={styles.footerBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.session}>
      <Pressable onPress={handleSessionClose} style={styles.back}>
        <Text style={styles.backText}>
          ← {t('dictionary.training.backToModes')}
        </Text>
      </Pressable>
      {mode === 'cards' ? (
        <CardsSession words={sessionWords} onClose={handleSessionClose} />
      ) : mode ? (
        <QuizSession
          mode={mode}
          words={sessionWords}
          distractorPool={allWords.length ? allWords : words}
          onClose={handleSessionClose}
        />
      ) : null}
    </View>
  );
}

function capitalize(mode: TrainingMode) {
  if (mode === 'cards') {
    return 'Cards';
  }
  if (mode === 'quizOptions') {
    return 'QuizOptions';
  }
  return 'QuizInput';
}

function CardsSession({
  words,
  onClose,
}: {
  words: DictionaryItem[];
  onClose: () => void;
}) {
  const {t} = useI18n();
  const ordered = useMemo(() => shuffleArray(words), [words]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = ordered[index];
  const finished = index >= ordered.length;

  if (finished || !current) {
    return (
      <View style={styles.center}>
        <Text style={styles.resultTitle}>
          {t('dictionary.training.yourResults')}
        </Text>
        <Button title={t('common.close')} onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Text style={styles.progress}>
        {index + 1} / {ordered.length}
      </Text>
      <Pressable onPress={() => setFlipped(v => !v)} style={styles.cardFlip}>
        <Text style={styles.cardFlipLabel}>
          {flipped ? t('dictionary.translation') : t('dictionary.sourceWord')}
        </Text>
        <Text style={styles.cardFlipWord}>
          {flipped ? current.translatedWord : current.sourceWord}
        </Text>
        <Text style={styles.cardFlipHint}>{t('dictionary.tapToFlip')}</Text>
      </Pressable>
      <View style={styles.nav}>
        <Button
          title={t('common.back')}
          variant="secondary"
          disabled={index <= 0}
          onPress={() => {
            setIndex(i => Math.max(0, i - 1));
            setFlipped(false);
          }}
        />
        <Button
          title={
            index >= ordered.length - 1
              ? t('dictionary.training.showResults')
              : t('lessons.next')
          }
          onPress={() => {
            if (index >= ordered.length - 1) {
              setIndex(ordered.length);
              return;
            }
            setIndex(i => i + 1);
            setFlipped(false);
          }}
        />
      </View>
    </View>
  );
}

function QuizSession({
  mode,
  words,
  distractorPool,
  onClose,
}: {
  mode: 'quizOptions' | 'quizInput';
  words: DictionaryItem[];
  distractorPool: DictionaryItem[];
  onClose: () => void;
}) {
  const {t} = useI18n();
  const ordered = useMemo(() => shuffleArray(words), [words]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [finished, setFinished] = useState(false);

  const current = ordered[index];
  const options = useMemo(() => {
    if (!current || mode !== 'quizOptions') {
      return [];
    }
    return buildQuizOptions(
      current.translatedWord,
      distractorPool.map(item => item.translatedWord),
      4,
    );
  }, [current, distractorPool, mode]);

  const submit = (answer: string) => {
    if (!current || state !== 'idle') {
      return;
    }
    const ok = answersMatch(answer, current.translatedWord);
    setState(ok ? 'correct' : 'wrong');
    setSelected(answer);
    if (ok) {
      setCorrectCount(n => n + 1);
    } else {
      setWrongCount(n => n + 1);
    }
  };

  const goNext = () => {
    if (index >= ordered.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(i => i + 1);
    setState('idle');
    setSelected(null);
    setInput('');
  };

  if (finished) {
    const total = correctCount + wrongCount;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <View style={styles.center}>
        <Text style={styles.resultTitle}>
          {t('dictionary.training.yourResults')}
        </Text>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.scoreOk}>
          {t('dictionary.training.correct')}: {correctCount}
        </Text>
        <Text style={styles.scoreBad}>
          {t('dictionary.training.incorrect')}: {wrongCount}
        </Text>
        <Button title={t('common.close')} onPress={onClose} />
      </View>
    );
  }

  if (!current) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.quiz}>
      <View style={styles.counters}>
        <Text style={styles.progress}>
          {index + 1} / {ordered.length}
        </Text>
        <Text style={styles.scoreBad}>{wrongCount}</Text>
        <Text style={styles.scoreOk}>{correctCount}</Text>
      </View>
      <View style={styles.prompt}>
        <Text style={styles.promptWord}>{current.sourceWord}</Text>
      </View>
      {mode === 'quizOptions' ? (
        options.map(option => {
          const isChosen = selected === option;
          const isCorrect = answersMatch(option, current.translatedWord);
          return (
            <Pressable
              key={option}
              disabled={state !== 'idle'}
              onPress={() => submit(option)}
              style={[
                styles.option,
                isChosen && state === 'correct' && styles.optionOk,
                isChosen && state === 'wrong' && styles.optionBad,
                state !== 'idle' && isCorrect && styles.optionOk,
              ]}>
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })
      ) : (
        <>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={state === 'idle'}
            placeholder={t('dictionary.training.answerPlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {state === 'idle' ? (
            <Button
              title={t('dictionary.training.checkAnswer')}
              disabled={!input.trim()}
              onPress={() => submit(input)}
            />
          ) : state === 'wrong' ? (
            <Text style={styles.reveal}>
              {t('dictionary.training.correctAnswerIs').replace(
                '{{answer}}',
                current.translatedWord,
              )}
            </Text>
          ) : null}
        </>
      )}
      {state !== 'idle' ? (
        <Button
          title={
            index >= ordered.length - 1
              ? t('dictionary.training.showResults')
              : t('dictionary.training.nextQuestion')
          }
          onPress={goNext}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {textAlign: 'center', color: colors.muted, marginTop: 40},
  modes: {gap: 12, paddingTop: 8, paddingBottom: 24},
  choose: {color: colors.textSecondary, fontSize: 15, marginBottom: 4},
  modeCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  modeTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  modeDesc: {marginTop: 4, fontSize: 13, color: colors.textSecondary},
  wordsStep: {flex: 1, minHeight: 0, gap: 8},
  wordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeHint: {color: colors.textSecondary, fontSize: 13, fontWeight: '600'},
  footer: {flexDirection: 'row', gap: 10, paddingTop: 4},
  footerBtn: {flex: 1},
  session: {flex: 1},
  back: {paddingVertical: 8},
  backText: {color: colors.primary, fontWeight: '700'},
  flex: {flex: 1, gap: 12},
  progress: {textAlign: 'center', color: colors.muted, fontWeight: '600'},
  cardFlip: {
    minHeight: 200,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  cardFlipLabel: {fontSize: 13, color: colors.muted, fontWeight: '600'},
  cardFlipWord: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  cardFlipHint: {fontSize: 13, color: colors.textSecondary},
  nav: {gap: 10},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10},
  resultTitle: {fontSize: 20, fontWeight: '800', color: colors.text},
  percent: {fontSize: 32, fontWeight: '800', color: colors.primary},
  scoreOk: {color: '#17c964', fontWeight: '700'},
  scoreBad: {color: '#f31260', fontWeight: '700'},
  quiz: {gap: 10, paddingBottom: 24},
  counters: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  prompt: {
    minHeight: 100,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  promptWord: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  option: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  optionOk: {borderColor: '#17c964', backgroundColor: 'rgba(23,201,100,0.12)'},
  optionBad: {borderColor: '#f31260', backgroundColor: 'rgba(243,18,96,0.12)'},
  optionText: {fontSize: 16, fontWeight: '600', color: colors.text},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  reveal: {color: colors.textSecondary, textAlign: 'center'},
});
