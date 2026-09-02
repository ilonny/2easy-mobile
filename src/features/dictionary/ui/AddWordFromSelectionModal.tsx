import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {Button} from '../../../shared/ui';
import {
  createDictionaryWord,
  createWordsForLesson,
  translateWord,
} from '../api/dictionaryApi';
import {useDictionaryLanguagePair} from '../model/useDictionaryLanguagePair';
import {DictionaryLanguagePairFields} from './LanguageSelect';

type Props = {
  visible: boolean;
  sourceWord: string;
  lessonId: number;
  /** Student adding for self */
  studentId?: number;
  /** Teacher bulk-add for lesson participants */
  isTeacherBulk?: boolean;
  participantIds?: number[];
  onClose: () => void;
  onSaved?: () => void;
};

export function AddWordFromSelectionModal({
  visible,
  sourceWord,
  lessonId,
  studentId,
  isTeacherBulk,
  participantIds,
  onClose,
  onSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const {
    languages,
    loadingLanguages,
    sourceLanguageCode,
    targetLanguageCode,
    setSourceLanguageCode,
    setTargetLanguageCode,
    swapLanguages,
    persistLanguagePair,
  } = useDictionaryLanguagePair(visible);

  const [source, setSource] = useState(sourceWord);
  const [translation, setTranslation] = useState('');
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const word = sourceWord.trim();
    setSource(word);
    setTranslation('');
    setError('');
  }, [visible, sourceWord]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const word = sourceWord.trim();
    if (
      !word ||
      !sourceLanguageCode ||
      !targetLanguageCode ||
      sourceLanguageCode === targetLanguageCode
    ) {
      if (sourceLanguageCode === targetLanguageCode) {
        setTranslation('');
      }
      return;
    }
    let cancelled = false;
    setTranslating(true);
    void (async () => {
      try {
        const res = await translateWord({
          text: word,
          sourceLanguageCode,
          targetLanguageCode,
        });
        if (cancelled) {
          return;
        }
        if (res.translatedWord) {
          setTranslation(res.translatedWord);
        }
      } finally {
        if (!cancelled) {
          setTranslating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, sourceWord, sourceLanguageCode, targetLanguageCode]);

  const onSave = async () => {
    const src = source.trim();
    const dst = translation.trim();
    if (!src) {
      setError(t('dictionary.translationRequired'));
      return;
    }
    if (!dst) {
      setError(t('dictionary.translationRequired'));
      return;
    }
    if (!sourceLanguageCode || !targetLanguageCode) {
      setError(t('dictionary.languageRequired'));
      return;
    }
    if (sourceLanguageCode === targetLanguageCode) {
      setError(t('dictionary.languagesMustDiffer'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await persistLanguagePair();
      const payload = {
        sourceWord: src,
        translatedWord: dst,
        sourceLanguageCode,
        targetLanguageCode,
        lessonId,
      };
      if (isTeacherBulk) {
        if (!participantIds?.length) {
          setError(t('dictionary.noStudentsOnLesson'));
          return;
        }
        const res = await createWordsForLesson(
          lessonId,
          payload,
          participantIds,
        );
        if (res.success === false) {
          setError(res.message || t('dictionary.actionFailed'));
          return;
        }
      } else {
        if (!studentId) {
          setError(t('dictionary.actionFailed'));
          return;
        }
        const res = await createDictionaryWord(studentId, payload);
        if (res.success === false) {
          setError(res.message || t('dictionary.actionFailed'));
          return;
        }
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {marginBottom: insets.bottom + 12 + keyboardHeight},
          ]}
          onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{t('dictionary.addWordTitle')}</Text>

          <DictionaryLanguagePairFields
            languages={languages}
            sourceLanguageCode={sourceLanguageCode}
            targetLanguageCode={targetLanguageCode}
            onChangeSource={setSourceLanguageCode}
            onChangeTarget={setTargetLanguageCode}
            onSwap={swapLanguages}
            loading={loadingLanguages}
          />

          <Text style={styles.label}>{t('dictionary.sourceWord')}</Text>
          <TextInput
            value={source}
            editable={false}
            style={[styles.input, styles.inputReadonly]}
            multiline
          />
          <Text style={styles.label}>{t('dictionary.translation')}</Text>
          <View style={styles.translationWrap}>
            <TextInput
              value={translation}
              onChangeText={setTranslation}
              placeholder={t('dictionary.translation')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              autoFocus
            />
            {translating ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.spinner}
              />
            ) : null}
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            title={t('common.save')}
            loading={saving}
            disabled={translating || !translation.trim()}
            onPress={() => {
              void onSave();
            }}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={onClose}
            disabled={saving}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'flex-end',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  label: {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBg,
    minHeight: 48,
  },
  inputReadonly: {color: colors.textSecondary, backgroundColor: '#F3F4F6'},
  translationWrap: {position: 'relative'},
  spinner: {position: 'absolute', right: 12, top: 14},
  error: {color: colors.danger, textAlign: 'center'},
});
