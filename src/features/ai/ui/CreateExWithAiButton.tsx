import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useLayout} from '../../../shared/lib/layout';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {AppDialog, Button} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';
import {ExercisePreview} from '../../lesson-editor/ui/editors/ExercisePreview';
import {
  fetchAiMeta,
  formatAiAvailableLimit,
  isAiLimitExceeded,
  refineAiExercise,
  remainingFromAiResponse,
} from '../api/aiApi';
import {canUseAi} from '../lib/canUseAi';

export const AI_SUPPORTED_EX_TYPES = [
  'text-default',
  'text-2-col',
  'text-sticker',
  'text-checklist',
  'note',
  'FILL_GAPS_NEW',
  'test',
  'match-word-word',
  'match-word-column',
  'free-input-form',
] as const;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  type: string;
  currentData?: Record<string, unknown> | null;
  onApply: (data: Record<string, unknown>) => void;
  lessonId?: number;
  lessonContext?: {
    title?: string;
    description?: string;
    tags?: string;
  };
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function prepareExerciseDataForAi(raw: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(raw || {}, (key, value) => {
      if (key === 'id' || key === 'sortIndex') {
        return undefined;
      }
      if (typeof value === 'string' && value.length > 8000) {
        return `${value.slice(0, 8000)}…`;
      }
      return value;
    }),
  ) as Record<string, unknown>;
}

export function CreateExWithAiButton({
  type,
  currentData,
  onApply,
  lessonId,
  lessonContext,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {t, language} = useI18n();
  const {profile} = useAuth();
  const {hasPaidTariff} = useSubscription();
  const {pageGutter, pageContentMaxWidth} = useLayout();
  const uiLanguage = language === 'en' ? 'en' : 'ru';

  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [limitRemaining, setLimitRemaining] = useState<number | null>(null);
  const [gateMessage, setGateMessage] = useState('');
  const keyboardHeight = useKeyboardBottomOffset(open);
  const latestDataRef = useRef<Record<string, unknown>>(currentData || {});
  const scrollRef = useRef<ScrollView>(null);

  const isCreate = !currentData?.id;

  useEffect(() => {
    latestDataRef.current = currentData || {};
  }, [currentData]);

  useEffect(() => {
    if (!open || keyboardHeight <= 0) {
      return;
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    });
  }, [open, keyboardHeight]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setInstruction('');
    setError('');
    setPendingData(null);
    setLimitRemaining(null);
    const welcome = t(isCreate ? 'ai.welcomeExCreate' : 'ai.welcomeExEdit');
    setMessages([{id: makeId(), role: 'assistant', content: welcome}]);
    void (async () => {
      try {
        const meta = await fetchAiMeta();
        if (cancelled) {
          return;
        }
        const remaining = meta?.limits?.refine_exercise?.remaining ?? null;
        setLimitRemaining(remaining);
        setMessages([
          {
            id: makeId(),
            role: 'assistant',
            content: `${welcome}\n\n${formatAiAvailableLimit(
              remaining,
              'refine_exercise',
              t,
            )}`,
          },
        ]);
      } catch {
        /* keep welcome without limit */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isCreate, t]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isLoading, pendingData, open]);

  const onSubmit = useCallback(async () => {
    if (!instruction.trim() || isLoading) {
      return;
    }
    const text = instruction.trim();
    setInstruction('');
    setIsLoading(true);
    setError('');
    setMessages(prev => [...prev, {id: makeId(), role: 'user', content: text}]);

    try {
      const json = await refineAiExercise({
        type,
        instruction: text,
        currentData: prepareExerciseDataForAi(latestDataRef.current),
        lesson_id: lessonId,
        lessonContext,
        ui_language: uiLanguage,
        conversation: messages
          .slice(-8)
          .map(m => ({role: m.role, content: m.content})),
      });

      if (!json?.success) {
        const msg = isAiLimitExceeded(json)
          ? t('ai.monthlyLimitExceeded')
          : json?.message || t('ai.failedUpdateExercise');
        setError(msg);
        setMessages(prev => [
          ...prev,
          {id: makeId(), role: 'assistant', content: msg},
        ]);
        return;
      }

      const remaining =
        remainingFromAiResponse(json, 'refine_exercise') ?? limitRemaining;
      if (typeof remaining === 'number') {
        setLimitRemaining(remaining);
      }

      const assistantText =
        json.assistantMessage ||
        (json.refused
          ? t('ai.refusedExHelp')
          : t('ai.doneUpdatedExercise'));

      setMessages(prev => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: `${assistantText}\n\n${formatAiAvailableLimit(
            remaining,
            'refine_exercise',
            t,
          )}`,
        },
      ]);

      if (!json.refused && json.data && typeof json.data === 'object') {
        setPendingData(json.data);
      }
    } catch {
      setError(t('ai.networkError'));
      setMessages(prev => [
        ...prev,
        {id: makeId(), role: 'assistant', content: t('ai.networkErrorRetry')},
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    instruction,
    isLoading,
    type,
    lessonId,
    lessonContext,
    messages,
    uiLanguage,
    limitRemaining,
    t,
  ]);

  if (!canUseAi(profile)) {
    return null;
  }
  if (
    !(AI_SUPPORTED_EX_TYPES as readonly string[]).includes(type)
  ) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => {
          if (!hasPaidTariff) {
            setGateMessage(t('ai.needPaidSubscription'));
            return;
          }
          setOpen(true);
        }}
        style={({pressed}) => [styles.trigger, pressed && styles.triggerPressed]}>
        <Text style={styles.triggerText}>{t('ai.exAssistant')}</Text>
        <Text style={styles.triggerIcon}>✦</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.root, {paddingTop: insets.top + 8}]}>
          <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {isCreate ? t('ai.createExWithAi') : t('ai.editExWithAi')}
              </Text>
              <Text style={styles.subtitle}>
                {isCreate
                  ? t('ai.createExWithAiHint')
                  : t('ai.editExWithAiHint')}
              </Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={10}
              style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.chat,
              {
                paddingHorizontal: pageGutter,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            {messages.map(m => (
              <View
                key={m.id}
                style={[
                  styles.bubbleWrap,
                  m.role === 'user' ? styles.bubbleWrapUser : null,
                ]}>
                <View
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
              </View>
            ))}
            {isLoading ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.thinkingText}>{t('ai.thinking')}</Text>
              </View>
            ) : null}

            {pendingData ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>
                  {t('ai.previewNewVariant')}
                </Text>
                <Text style={styles.previewHint}>
                  {t('ai.previewNewVariantHint')}
                </Text>
                <View style={styles.previewInner}>
                  <ExercisePreview
                    type={type}
                    data={pendingData}
                    lessonId={lessonId}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.composer,
              {
                paddingHorizontal: pageGutter,
                paddingBottom:
                  12 +
                  (keyboardHeight > 0
                    ? 8
                    : Math.max(insets.bottom, 8)),
                marginBottom: keyboardHeight,
              },
            ]}>
            <Text style={styles.limit}>
              {formatAiAvailableLimit(
                limitRemaining,
                'refine_exercise',
                t,
              )}
            </Text>
            {pendingData ? (
              <View style={styles.applyRow}>
                <View style={styles.applyHalf}>
                  <Button
                    title={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setPendingData(null)}
                  />
                </View>
                <View style={styles.applyHalf}>
                  <Button
                    title={t('ai.apply')}
                    onPress={() => {
                      latestDataRef.current = pendingData;
                      onApply(pendingData);
                      setPendingData(null);
                      setOpen(false);
                    }}
                  />
                </View>
              </View>
            ) : (
              <>
                <TextInput
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder={t('ai.editExPlaceholder')}
                  placeholderTextColor={colors.muted}
                  multiline
                  editable={!isLoading}
                  style={styles.input}
                  onFocus={() => {
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollToEnd({animated: true});
                    });
                  }}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button
                  title={t('ai.send')}
                  onPress={() => {
                    void onSubmit();
                  }}
                  loading={isLoading}
                  disabled={!instruction.trim()}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      <AppDialog
        visible={!!gateMessage}
        message={gateMessage}
        onClose={() => setGateMessage('')}
        actions={[
          {
            label: t('lessons.chooseTariff'),
            onPress: () => {
              setGateMessage('');
              navigation.navigate('Subscription');
            },
          },
          {
            label: t('common.close'),
            variant: 'ghost',
            onPress: () => setGateMessage(''),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  trigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  triggerPressed: {opacity: 0.85, backgroundColor: colors.primarySoft},
  triggerText: {color: colors.primary, fontWeight: '700', fontSize: 14},
  triggerIcon: {color: colors.primary, fontSize: 14, fontWeight: '800'},
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {flex: 1, gap: 4},
  title: {fontSize: 20, fontWeight: '800', color: colors.primary},
  subtitle: {fontSize: 13, lineHeight: 18, color: colors.textSecondary},
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  chat: {paddingTop: 12, paddingBottom: 16, gap: 10},
  bubbleWrap: {alignItems: 'flex-start'},
  bubbleWrapUser: {alignItems: 'flex-end'},
  bubble: {
    maxWidth: '90%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAi: {backgroundColor: '#EEE'},
  bubbleUser: {backgroundColor: colors.primary},
  bubbleText: {fontSize: 14, lineHeight: 20, color: colors.text},
  bubbleTextUser: {color: colors.white},
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  thinkingText: {color: colors.muted, fontSize: 13},
  previewCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    padding: 12,
    gap: 8,
  },
  previewTitle: {fontWeight: '700', color: colors.text},
  previewHint: {fontSize: 12, color: colors.textSecondary},
  previewInner: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 10,
    gap: 10,
  },
  limit: {fontSize: 12, color: colors.muted},
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: '#F9F9F9',
  },
  error: {color: colors.danger, fontSize: 13},
  applyRow: {flexDirection: 'row', gap: 10},
  applyHalf: {flex: 1},
});
