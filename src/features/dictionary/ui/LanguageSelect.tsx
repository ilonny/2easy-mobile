import {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {DictionaryLanguage} from '../api/dictionaryApi';
import {languageLabel} from '../lib/languagePairStorage';

type Props = {
  label: string;
  languages: DictionaryLanguage[];
  selectedCode: string;
  onSelect: (code: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function LanguageSelect({
  label,
  languages,
  selectedCode,
  onSelect,
  loading,
  disabled,
}: Props) {
  const {t} = useI18n();
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => languages.find(language => language.code === selectedCode),
    [languages, selectedCode],
  );

  const display = selected
    ? languageLabel(selected)
    : selectedCode || t('dictionary.selectLanguage');

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        style={({pressed}) => [
          styles.trigger,
          (disabled || loading) && styles.triggerDisabled,
          pressed && styles.triggerPressed,
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <Text style={styles.triggerText} numberOfLines={1}>
              {display}
            </Text>
            {!!selectedCode && (
              <Text style={styles.code}>{selectedCode.toUpperCase()}</Text>
            )}
          </>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={languages}
              keyExtractor={item => item.code}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => {
                const active = item.code === selectedCode;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.code);
                      setOpen(false);
                    }}
                    style={({pressed}) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && styles.triggerPressed,
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}>
                      {languageLabel(item)}
                    </Text>
                    <Text style={styles.optionCode}>
                      {item.code.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.empty}>{t('dictionary.empty')}</Text>
              }
            />
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type PairProps = {
  languages: DictionaryLanguage[];
  sourceLanguageCode: string;
  targetLanguageCode: string;
  onChangeSource: (code: string) => void;
  onChangeTarget: (code: string) => void;
  onSwap: () => void;
  loading?: boolean;
};

export function DictionaryLanguagePairFields({
  languages,
  sourceLanguageCode,
  targetLanguageCode,
  onChangeSource,
  onChangeTarget,
  onSwap,
  loading,
}: PairProps) {
  const {t} = useI18n();

  return (
    <View style={styles.pairRow}>
      <View style={styles.pairCol}>
        <LanguageSelect
          label={t('dictionary.sourceLanguage')}
          languages={languages}
          selectedCode={sourceLanguageCode}
          onSelect={onChangeSource}
          loading={loading}
        />
      </View>
      <Pressable
        onPress={onSwap}
        disabled={loading}
        hitSlop={8}
        style={({pressed}) => [
          styles.swapBtn,
          pressed && styles.triggerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('dictionary.swapLanguages')}>
        <Text style={styles.swapIcon}>⇄</Text>
      </Pressable>
      <View style={styles.pairCol}>
        <LanguageSelect
          label={t('dictionary.targetLanguage')}
          languages={languages}
          selectedCode={targetLanguageCode}
          onSelect={onChangeTarget}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 6},
  label: {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerDisabled: {opacity: 0.6},
  triggerPressed: {opacity: 0.85},
  triggerText: {flex: 1, fontSize: 15, color: colors.text, fontWeight: '600'},
  code: {fontSize: 12, fontWeight: '700', color: colors.muted},
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    maxHeight: '70%',
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  list: {paddingHorizontal: 8},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: radii.sm,
    gap: 8,
  },
  optionActive: {backgroundColor: colors.primarySoft},
  optionText: {flex: 1, fontSize: 15, fontWeight: '600', color: colors.text},
  optionTextActive: {color: colors.primary},
  optionCode: {fontSize: 12, fontWeight: '700', color: colors.muted},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    paddingVertical: 24,
  },
  cancelBtn: {
    marginTop: 8,
    marginHorizontal: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {fontSize: 15, fontWeight: '700', color: colors.muted},
  pairRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  pairCol: {flex: 1, minWidth: 0},
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  swapIcon: {fontSize: 22, color: colors.primary, fontWeight: '700'},
});
