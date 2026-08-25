import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button, TextField} from '../../../shared/ui';
import {
  fetchAiMeta,
  formatAiAvailableLimit,
  generateAiLesson,
  isAiLimitExceeded,
  refineAiLesson,
  saveAiLesson,
  suggestAiTopic,
} from '../api/aiApi';
import {
  AI_EXERCISE_TYPE_OPTIONS,
  AI_LEVELS,
  getExercisePreviewTitle,
  type AiChatMessage,
  type AiLessonDraft,
  type AiLevel,
} from '../lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (lessonId: number) => void;
  courseId?: number;
};

type Step = 'collect' | 'confirmTopic' | 'preview';

type SuggestedTopic = {
  topic: string;
  title: string;
  description: string;
  tags: string;
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_TYPES = [
  'text-default',
  'FILL_GAPS_NEW',
  'test',
  'free-input-form',
];

export function CreateLessonWithAiModal({
  visible,
  onClose,
  onCreated,
  courseId,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t, language} = useI18n();
  const {isTablet, pageGutter, authFormMaxWidth} = useLayout();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>('collect');
  const [level, setLevel] = useState<AiLevel | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_TYPES);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [draft, setDraft] = useState<AiLessonDraft | null>(null);
  const [pendingPreview, setPendingPreview] = useState<AiLessonDraft | null>(
    null,
  );
  const [suggestedTopic, setSuggestedTopic] = useState<SuggestedTopic | null>(
    null,
  );
  const [rejectedTopics, setRejectedTopics] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [limitRemaining, setLimitRemaining] = useState<number | null>(null);

  const uiLanguage = language === 'en' ? 'en' : 'ru';

  const welcome = useCallback(
    (remaining?: number | null) => {
      const base = t('ai.welcomeLessonCreate');
      if (remaining == null) {
        return base;
      }
      return `${base}\n\n${formatAiAvailableLimit(
        remaining,
        'generate_lesson',
        t,
      )}`;
    },
    [t],
  );

  const resetState = useCallback(() => {
    setStep('collect');
    setLevel(null);
    setSelectedTypes(DEFAULT_TYPES);
    setTopic('');
    setDescription('');
    setMessages([{id: makeId(), role: 'assistant', content: welcome()}]);
    setChatInput('');
    setDraft(null);
    setPendingPreview(null);
    setSuggestedTopic(null);
    setRejectedTopics([]);
    setIsGenerating(false);
    setError('');
    setLimitRemaining(null);
  }, [welcome]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    resetState();
    let cancelled = false;
    (async () => {
      const meta = await fetchAiMeta();
      if (cancelled || !meta?.success) {
        return;
      }
      const remaining = meta.limits?.generate_lesson?.remaining ?? null;
      setLimitRemaining(remaining);
      setMessages([
        {id: makeId(), role: 'assistant', content: welcome(remaining)},
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, resetState, welcome]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    }, 80);
    return () => clearTimeout(timer);
  }, [messages, isGenerating, draft, suggestedTopic, pendingPreview, visible]);

  const canGenerate = Boolean(level && selectedTypes.length > 0);

  const typeLabel = useCallback(
    (type: string) => {
      const found = AI_EXERCISE_TYPE_OPTIONS.find(o => o.type === type);
      return found ? t(found.titleKey) : type;
    },
    [t],
  );

  const appendAssistant = (content: string) => {
    setMessages(prev => [
      ...prev,
      {id: makeId(), role: 'assistant', content},
    ]);
  };

  const appendUser = (content: string) => {
    setMessages(prev => [...prev, {id: makeId(), role: 'user', content}]);
  };

  const conversationPayload = (list: AiChatMessage[]) =>
    list
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({role: m.role, content: m.content}));

  const normalizeDraft = (json: AiLessonDraft): AiLessonDraft => ({
    assistantMessage: json.assistantMessage,
    lesson: json.lesson,
    exercises: (json.exercises || []).map((exercise, index) => ({
      ...exercise,
      clientKey:
        exercise.clientKey ||
        (!exercise.id ? `draft-${index}-${exercise.type}` : undefined),
      sortIndex: Number.isInteger(exercise.sortIndex)
        ? exercise.sortIndex
        : index,
    })),
  });

  const runGenerateLesson = useCallback(
    async (topicToUse: string) => {
      if (!level) {
        return;
      }
      setError('');
      setIsGenerating(true);
      appendAssistant(t('ai.generatingLesson'));
      try {
        const json = await generateAiLesson({
          level,
          topic: topicToUse.trim(),
          description: description.trim(),
          exerciseTypes: selectedTypes,
          conversation: conversationPayload(messages),
          ui_language: uiLanguage,
        });
        if (!json?.success) {
          const msg = isAiLimitExceeded(json)
            ? t('ai.monthlyLimitExceeded')
            : json?.message || t('ai.generateFailed');
          setError(msg);
          appendAssistant(msg);
          return;
        }
        if (typeof json.aiLimit?.remaining === 'number') {
          setLimitRemaining(json.aiLimit.remaining);
        }
        const nextDraft = normalizeDraft(json);
        setDraft(nextDraft);
        setPendingPreview(null);
        setTopic(topicToUse.trim() || json.lesson?.title || '');
        setStep('preview');
        appendAssistant(
          `${
            json.assistantMessage ||
            t('ai.generateReady').replace(
              '{{title}}',
              json.lesson?.title || '',
            )
          }\n\n${formatAiAvailableLimit(
            json.aiLimit?.remaining ?? limitRemaining,
            'generate_lesson',
            t,
          )}`,
        );
      } catch {
        setError(t('ai.networkErrorCheck'));
        appendAssistant(t('ai.networkErrorCheck'));
      } finally {
        setIsGenerating(false);
      }
    },
    [
      level,
      description,
      selectedTypes,
      messages,
      uiLanguage,
      t,
      limitRemaining,
    ],
  );

  const runSuggestTopic = useCallback(
    async (rejectList: string[]) => {
      if (!level) {
        return;
      }
      setError('');
      setIsGenerating(true);
      appendAssistant(t('ai.suggestingTopic'));
      try {
        const json = await suggestAiTopic({
          level,
          description: description.trim(),
          exerciseTypes: selectedTypes,
          rejectTopics: rejectList,
          ui_language: uiLanguage,
        });
        if (!json?.success) {
          const msg = isAiLimitExceeded(json)
            ? t('ai.monthlyLimitExceeded')
            : json?.message || t('ai.suggestFailed');
          setError(msg);
          appendAssistant(msg);
          return;
        }
        const suggestion: SuggestedTopic = {
          topic: json.topic || json.title || '',
          title: json.title || json.topic || '',
          description: json.description || '',
          tags: json.tags || level,
        };
        setSuggestedTopic(suggestion);
        setStep('confirmTopic');
        appendAssistant(
          json.assistantMessage ||
            t('ai.suggestedTopicAsk').replace('{{title}}', suggestion.title),
        );
      } catch {
        setError(t('ai.networkErrorCheck'));
        appendAssistant(t('ai.networkErrorCheck'));
      } finally {
        setIsGenerating(false);
      }
    },
    [level, description, selectedTypes, uiLanguage, t],
  );

  const handleGenerate = async () => {
    if (!canGenerate || !level || isGenerating) {
      return;
    }
    const summary = [
      `${t('ai.level')}: ${level}`,
      topic.trim()
        ? `${t('ai.topic')}: ${topic.trim()}`
        : `${t('ai.topic')}: (${t('ai.topicAuto')})`,
      description.trim() ? `${t('ai.description')}: ${description.trim()}` : '',
      `${t('ai.exerciseTypes')}: ${selectedTypes.map(typeLabel).join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');
    appendUser(summary);
    if (!topic.trim()) {
      await runSuggestTopic(rejectedTopics);
      return;
    }
    await runGenerateLesson(topic.trim());
  };

  const handleAcceptTopic = async () => {
    if (!suggestedTopic || isGenerating) {
      return;
    }
    appendUser(t('ai.topicAccept'));
    const topicToUse = suggestedTopic.title || suggestedTopic.topic;
    setTopic(topicToUse);
    await runGenerateLesson(topicToUse);
  };

  const handleRejectTopic = async () => {
    if (!suggestedTopic || isGenerating) {
      return;
    }
    const rejected = [
      ...rejectedTopics,
      suggestedTopic.title,
      suggestedTopic.topic,
    ].filter(Boolean);
    setRejectedTopics(rejected);
    appendUser(t('ai.topicReject'));
    setSuggestedTopic(null);
    await runSuggestTopic(rejected);
  };

  const handleEnterTopicSelf = () => {
    setSuggestedTopic(null);
    setStep('collect');
    appendUser(t('ai.topicEnterOwn'));
  };

  const handleRefine = async () => {
    const base = pendingPreview || draft;
    if (!base || !chatInput.trim() || isGenerating) {
      return;
    }
    const instruction = chatInput.trim();
    setChatInput('');
    setError('');
    setIsGenerating(true);
    appendUser(instruction);
    try {
      const json = await refineAiLesson({
        instruction,
        current: base,
        conversation: conversationPayload(messages),
        ui_language: uiLanguage,
      });
      if (!json?.success) {
        const msg = isAiLimitExceeded(json)
          ? t('ai.monthlyLimitExceeded')
          : json?.message || t('ai.refineFailed');
        setError(msg);
        appendAssistant(msg);
        return;
      }
      if (typeof json.aiLimit?.remaining === 'number') {
        setLimitRemaining(json.aiLimit.remaining);
      }
      setPendingPreview(normalizeDraft(json));
      appendAssistant(
        json.assistantMessage || t('ai.refineReady'),
      );
    } catch {
      setError(t('ai.networkErrorCheck'));
      appendAssistant(t('ai.networkErrorCheck'));
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPending = () => {
    if (!pendingPreview) {
      return;
    }
    setDraft(pendingPreview);
    setPendingPreview(null);
    appendAssistant(t('ai.refineApplied'));
  };

  const discardPending = () => {
    setPendingPreview(null);
    appendAssistant(t('ai.refineDiscarded'));
  };

  const handleSave = async () => {
    if (!draft || pendingPreview || isGenerating) {
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const saved = await saveAiLesson({
        draft,
        ...(courseId != null ? {course_id: courseId} : {}),
      });
      if (!saved?.success) {
        const msg = saved?.message || t('ai.saveFailed');
        setError(msg);
        return;
      }
      const lessonId = Number(
        saved.id ??
          saved.createdLesson?.id ??
          saved.createdLesson?.dataValues?.id ??
          0,
      );
      if (!lessonId) {
        setError(t('ai.saveFailed'));
        return;
      }
      onCreated(lessonId);
    } catch {
      setError(t('ai.saveFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(x => x !== type) : prev.concat(type),
    );
  };

  const previewExercises = useMemo(
    () => (pendingPreview || draft)?.exercises || [],
    [pendingPreview, draft],
  );

  const previewLesson = (pendingPreview || draft)?.lesson;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.root}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.closeBtn,
              {top: insets.top + 8, right: pageGutter},
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}>
            <Text style={styles.close}>✕</Text>
          </Pressable>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.body,
              {
                paddingHorizontal: pageGutter,
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 28,
                maxWidth: isTablet ? 720 : undefined,
                width: '100%',
                alignSelf: 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{t('ai.createWithAi')}</Text>
              <Text style={styles.title}>
                {step === 'preview'
                  ? previewLesson?.title || t('ai.preview')
                  : t('ai.createWithAiHint')}
              </Text>
            </View>

            <View style={styles.chat}>
              {messages.map(m => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                  ]}>
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === 'user' && styles.bubbleTextUser,
                    ]}>
                    {m.content}
                  </Text>
                </View>
              ))}
              {isGenerating ? (
                <View style={styles.thinking}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.thinkingText}>{t('ai.thinking')}</Text>
                </View>
              ) : null}
            </View>

            {step === 'collect' ? (
              <View style={[styles.form, {maxWidth: authFormMaxWidth}]}>
                <Text style={styles.label}>{t('ai.level')}</Text>
                <View style={styles.chips}>
                  {AI_LEVELS.map(item => {
                    const active = level === item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setLevel(item)}
                        style={[styles.chip, active && styles.chipActive]}>
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>{t('ai.exerciseTypes')}</Text>
                <View style={styles.chips}>
                  {AI_EXERCISE_TYPE_OPTIONS.map(opt => {
                    const active = selectedTypes.includes(opt.type);
                    return (
                      <Pressable
                        key={opt.type}
                        onPress={() => toggleType(opt.type)}
                        style={[styles.chip, active && styles.chipActive]}>
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}>
                          {t(opt.titleKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextField
                  label={t('ai.topic')}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder={t('ai.topicPlaceholder')}
                  style={styles.topicInput}
                />
                <TextField
                  label={t('ai.description')}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('ai.descriptionPlaceholder')}
                  multiline
                  style={styles.multiline}
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <Button
                  title={t('ai.generate')}
                  onPress={() => {
                    void handleGenerate();
                  }}
                  loading={isGenerating}
                  disabled={!canGenerate || isGenerating}
                />
              </View>
            ) : null}

            {step === 'confirmTopic' && suggestedTopic ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('ai.suggestedTopic')}</Text>
                <Text style={styles.topicTitle}>{suggestedTopic.title}</Text>
                {!!suggestedTopic.description && (
                  <Text style={styles.topicDesc}>
                    {suggestedTopic.description}
                  </Text>
                )}
                <Button
                  title={t('ai.topicAcceptGenerate')}
                  onPress={() => {
                    void handleAcceptTopic();
                  }}
                  loading={isGenerating}
                />
                <Button
                  title={t('ai.topicReject')}
                  variant="secondary"
                  onPress={() => {
                    void handleRejectTopic();
                  }}
                  disabled={isGenerating}
                />
                {!isGenerating ? (
                  <Pressable
                    onPress={handleEnterTopicSelf}
                    style={styles.linkWrap}>
                    <Text style={styles.link}>{t('ai.topicEnterOwn')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {step === 'preview' && previewLesson ? (
              <View style={styles.previewBlock}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('ai.preview')}</Text>
                  <Text style={styles.topicTitle}>{previewLesson.title}</Text>
                  {!!previewLesson.description && (
                    <Text style={styles.topicDesc}>
                      {previewLesson.description}
                    </Text>
                  )}
                  <Text style={styles.exercisesLabel}>{t('ai.exercises')}</Text>
                  {previewExercises.map((ex, index) => (
                    <View key={ex.clientKey || `${ex.type}-${index}`} style={styles.exRow}>
                      <Text style={styles.exType}>{typeLabel(ex.type)}</Text>
                      <Text style={styles.exTitle}>
                        {getExercisePreviewTitle(ex, typeLabel(ex.type))}
                      </Text>
                    </View>
                  ))}
                </View>

                {pendingPreview ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('ai.refineReady')}</Text>
                    <Button
                      title={t('ai.applyChanges')}
                      onPress={applyPending}
                    />
                    <Button
                      title={t('ai.discardChanges')}
                      variant="secondary"
                      onPress={discardPending}
                    />
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.label}>{t('ai.sendRefine')}</Text>
                    <TextInput
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder={t('ai.refinePlaceholder')}
                      placeholderTextColor={colors.muted}
                      multiline
                      style={styles.refineInput}
                    />
                    <Button
                      title={t('ai.sendRefine')}
                      onPress={() => {
                        void handleRefine();
                      }}
                      loading={isGenerating}
                      disabled={!chatInput.trim() || isGenerating}
                      variant="secondary"
                    />
                  </View>
                )}

                {!!error && <Text style={styles.error}>{error}</Text>}

                <Button
                  title={t('ai.saveLesson')}
                  onPress={() => {
                    void handleSave();
                  }}
                  loading={isGenerating}
                  disabled={!!pendingPreview || isGenerating}
                />
                <Pressable
                  onPress={() => {
                    setStep('collect');
                    setDraft(null);
                    setPendingPreview(null);
                  }}
                  style={styles.linkWrap}>
                  <Text style={styles.link}>{t('ai.regenerate')}</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  headerText: {gap: 4, paddingRight: 44, paddingBottom: 8},
  kicker: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  body: {gap: 16, paddingTop: 4},
  chat: {gap: 10},
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: '92%',
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleText: {color: colors.text, fontSize: 14, lineHeight: 20},
  bubbleTextUser: {color: colors.white},
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  thinkingText: {color: colors.muted, fontWeight: '600'},
  form: {gap: 12, width: '100%', alignSelf: 'center'},
  label: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {fontWeight: '600', color: colors.text, fontSize: 13},
  chipTextActive: {color: colors.primary},
  topicInput: {minHeight: 52, fontSize: 16},
  multiline: {minHeight: 140, textAlignVertical: 'top', fontSize: 16, paddingTop: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 15,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  topicDesc: {color: colors.textSecondary, lineHeight: 20},
  previewBlock: {gap: 12},
  exercisesLabel: {
    marginTop: 6,
    fontWeight: '700',
    color: colors.text,
  },
  exRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 2,
  },
  exType: {fontSize: 12, color: colors.muted, fontWeight: '600'},
  exTitle: {fontSize: 15, fontWeight: '600', color: colors.text},
  refineInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    color: colors.text,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    fontSize: 16,
  },
  error: {color: colors.danger, textAlign: 'center'},
  linkWrap: {alignItems: 'center', paddingVertical: 8},
  link: {color: colors.primary, fontWeight: '700'},
});
