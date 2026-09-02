import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {AppDialog, Button} from '../../../shared/ui';
import {
  createDictionaryWord,
  deleteDictionaryWords,
  fetchDictionary,
  translateWord,
  updateDictionaryLearned,
  type DictionaryItem,
} from '../api/dictionaryApi';
import {useDictionaryLanguagePair} from '../model/useDictionaryLanguagePair';
import {DictionaryLanguagePairFields} from './LanguageSelect';
import {TrainingPanel} from './TrainingPanel';

type Tab = 'unlearned' | 'learned' | 'training';

type Props = {
  visible: boolean;
  studentId: number;
  onClose: () => void;
};

export function DictionaryModal({visible, studentId, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  const [tab, setTab] = useState<Tab>('unlearned');
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [sourceWord, setSourceWord] = useState('');
  const [translatedWord, setTranslatedWord] = useState('');
  const [saving, setSaving] = useState(false);
  const keyboardHeight = useKeyboardBottomOffset(visible && addOpen);
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState(false);
  const {
    languages,
    loadingLanguages,
    sourceLanguageCode,
    targetLanguageCode,
    setSourceLanguageCode,
    setTargetLanguageCode,
    swapLanguages,
    persistLanguagePair,
  } = useDictionaryLanguagePair(visible && addOpen);

  const load = useCallback(async () => {
    if (!studentId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchDictionary(studentId, {
        search: search.trim() || undefined,
        isLearned:
          tab === 'learned' ? true : tab === 'unlearned' ? false : undefined,
      });
      setItems(list);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, search, tab]);

  useEffect(() => {
    if (!visible) {
      setTab('unlearned');
      setSearch('');
      setSelectedIds([]);
      setAddOpen(false);
      return;
    }
    void load();
  }, [visible, load]);

  const trainingWords = useMemo(
    () => items.filter(item => !item.isLearned),
    [items],
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id),
    );
  };

  const onMark = async (isLearned: boolean) => {
    if (!selectedIds.length) {
      return;
    }
    const res = await updateDictionaryLearned(studentId, selectedIds, isLearned);
    if (res.success === false) {
      setNotice(res.message || t('dictionary.actionFailed'));
      return;
    }
    setNotice(
      isLearned
        ? t('dictionary.markedAsLearned')
        : t('dictionary.markedAsUnlearned'),
    );
    await load();
  };

  const onDelete = async () => {
    if (!selectedIds.length) {
      return;
    }
    setPendingDelete(false);
    const res = await deleteDictionaryWords(studentId, selectedIds);
    if (res.success === false) {
      setNotice(res.message || t('dictionary.actionFailed'));
      return;
    }
    setNotice(t('dictionary.wordsDeleted'));
    await load();
  };

  const onTranslate = async () => {
    if (!sourceWord.trim()) {
      return;
    }
    if (!sourceLanguageCode || !targetLanguageCode) {
      setNotice(t('dictionary.languageRequired'));
      return;
    }
    if (sourceLanguageCode === targetLanguageCode) {
      setNotice(t('dictionary.languagesMustDiffer'));
      return;
    }
    setSaving(true);
    try {
      const res = await translateWord({
        text: sourceWord.trim(),
        sourceLanguageCode,
        targetLanguageCode,
      });
      if (res.translatedWord) {
        setTranslatedWord(res.translatedWord);
      }
    } finally {
      setSaving(false);
    }
  };

  const onAddWord = async () => {
    if (!sourceWord.trim() || !translatedWord.trim()) {
      setNotice(t('dictionary.translationRequired'));
      return;
    }
    if (!sourceLanguageCode || !targetLanguageCode) {
      setNotice(t('dictionary.languageRequired'));
      return;
    }
    if (sourceLanguageCode === targetLanguageCode) {
      setNotice(t('dictionary.languagesMustDiffer'));
      return;
    }
    setSaving(true);
    try {
      await persistLanguagePair();
      const res = await createDictionaryWord(studentId, {
        sourceWord: sourceWord.trim(),
        translatedWord: translatedWord.trim(),
        sourceLanguageCode,
        targetLanguageCode,
      });
      if (res.success === false) {
        setNotice(res.message || t('dictionary.actionFailed'));
        return;
      }
      setAddOpen(false);
      setSourceWord('');
      setTranslatedWord('');
      setNotice(t('dictionary.wordAdded'));
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
          <Text style={styles.title}>{t('dictionary.title')}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <View style={[styles.tabs, {paddingHorizontal: pageGutter}]}>
          {(
            [
              ['unlearned', t('dictionary.unlearnedTab')],
              ['learned', t('dictionary.learnedTab')],
              ['training', t('dictionary.trainingTab')],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}>
              <Text
                style={[styles.tabText, tab === key && styles.tabTextActive]}
                numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab !== 'training' ? (
          <View
            style={[
              styles.toolbar,
              {
                paddingHorizontal: pageGutter,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('dictionary.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.search}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              onSubmitEditing={() => {
                void load();
              }}
            />
            <View style={styles.actionsRow}>
              <Button
                title={t('dictionary.addWordAlt')}
                onPress={() => setAddOpen(true)}
                style={styles.actionBtn}
              />
              {selectedIds.length > 0 ? (
                <>
                  <Button
                    title={
                      tab === 'unlearned'
                        ? t('dictionary.markLearned')
                        : t('dictionary.markUnlearned')
                    }
                    variant="secondary"
                    onPress={() => {
                      void onMark(tab === 'unlearned');
                    }}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={t('common.delete')}
                    variant="secondary"
                    onPress={() => setPendingDelete(true)}
                    style={styles.actionBtn}
                  />
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : tab === 'training' ? (
          <View
            style={[
              styles.trainingWrap,
              {
                paddingHorizontal: pageGutter,
                paddingBottom: insets.bottom + 24,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <TrainingPanel words={trainingWords} allWords={items} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[
              styles.list,
              {
                paddingHorizontal: pageGutter,
                paddingBottom: insets.bottom + 24,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('dictionary.empty')}</Text>
            }
            renderItem={({item}) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={[styles.wordCard, selected && styles.wordCardSelected]}>
                  <View style={styles.wordMeta}>
                    <Text style={styles.wordSource}>{item.sourceWord}</Text>
                    <Text style={styles.wordTranslation}>
                      {item.translatedWord}
                    </Text>
                    {!!item.lessonName && (
                      <Text style={styles.wordLesson}>
                        {t('dictionary.lessonBadge').replace(
                          '{{name}}',
                          item.lessonName,
                        )}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[styles.check, selected && styles.checkSelected]}>
                    {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Modal visible={addOpen} transparent animationType="fade">
        <Pressable
          style={[styles.addBackdrop, {paddingBottom: keyboardHeight}]}
          onPress={() => setAddOpen(false)}>
          <Pressable style={styles.addCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.addTitle}>{t('dictionary.addWordTitle')}</Text>
            <DictionaryLanguagePairFields
              languages={languages}
              sourceLanguageCode={sourceLanguageCode}
              targetLanguageCode={targetLanguageCode}
              onChangeSource={setSourceLanguageCode}
              onChangeTarget={setTargetLanguageCode}
              onSwap={swapLanguages}
              loading={loadingLanguages}
            />
            <TextInput
              value={sourceWord}
              onChangeText={setSourceWord}
              placeholder={t('dictionary.sourceWord')}
              placeholderTextColor={colors.muted}
              style={styles.addInput}
              autoCapitalize="none"
            />
            <TextInput
              value={translatedWord}
              onChangeText={setTranslatedWord}
              placeholder={t('dictionary.translation')}
              placeholderTextColor={colors.muted}
              style={styles.addInput}
              autoCapitalize="none"
            />
            <Button
              title={t('dictionary.translate')}
              variant="secondary"
              loading={saving}
              onPress={() => {
                void onTranslate();
              }}
            />
            <Button
              title={t('common.save')}
              loading={saving}
              onPress={() => {
                void onAddWord();
              }}
            />
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => setAddOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog
        visible={pendingDelete}
        title={t('common.delete')}
        message={t('dictionary.deleteConfirm').replace(
          '{{count}}',
          String(selectedIds.length),
        )}
        onClose={() => setPendingDelete(false)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              void onDelete();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setPendingDelete(false),
          },
        ]}
      />

      <AppDialog
        visible={!!notice}
        message={notice}
        onClose={() => setNotice('')}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(''),
          },
        ]}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: {fontSize: 22, fontWeight: '800', color: colors.primary},
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  tabs: {flexDirection: 'row', gap: 8, marginBottom: 12},
  tab: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tabText: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  tabTextActive: {color: colors.primary},
  toolbar: {gap: 10, marginBottom: 8},
  search: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  actionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  actionBtn: {flexGrow: 1, minWidth: 120},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {gap: 10, paddingTop: 4},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
  },
  wordCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  wordMeta: {flex: 1, gap: 4},
  wordSource: {fontSize: 16, fontWeight: '700', color: colors.text},
  wordTranslation: {fontSize: 14, color: colors.textSecondary},
  wordLesson: {fontSize: 12, color: colors.muted},
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {color: colors.white, fontWeight: '800'},
  trainingWrap: {flex: 1, gap: 16, paddingTop: 12},
  trainingProgress: {
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '600',
  },
  cardFlip: {
    minHeight: 220,
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
  trainingNav: {gap: 10},
  addBackdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    padding: 20,
  },
  addCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    gap: 12,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  addInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
});
