import {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors, radii} from '../../../../shared/config/theme';
import {answerFeedback} from './answerFeedback';

type Option = {
  id: string;
  label: string;
  isCorrect?: boolean;
};

type Props = {
  value?: string;
  placeholder?: string;
  options: Option[];
  onChange: (option: Option) => void;
  status?: 'ok' | 'bad' | 'neutral';
  disabled?: boolean;
  /** Teacher mode: tint correct options in the sheet (like site). */
  highlightCorrect?: boolean;
};

/**
 * Select that opens a full-screen overlay so the menu is always above
 * ScrollView cards / sibling layers (fixes z-index clipping).
 */
export function OptionSelect({
  value,
  placeholder = '—',
  options,
  onChange,
  status = 'neutral',
  disabled,
  highlightCorrect,
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const title = useMemo(
    () => options.find(o => o.label === value || o.id === value)?.label || value,
    [options, value],
  );

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          status === 'ok' && answerFeedback.ok,
          status === 'bad' && answerFeedback.bad,
        ]}>
        <Text
          style={[
            styles.triggerText,
            status === 'ok' && answerFeedback.okText,
            status === 'bad' && answerFeedback.badText,
          ]}>
          {title || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              {paddingBottom: Math.max(insets.bottom, 16)},
            ]}
            onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Выберите вариант</Text>
            <ScrollView style={styles.sheetScroll}>
              {options.map(opt => {
                const correct = !!highlightCorrect && !!opt.isCorrect;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.option, correct && styles.optionCorrect]}
                    onPress={() => {
                      onChange(opt);
                      setOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.optionText,
                        correct && styles.optionTextCorrect,
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.cancel}
              onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Отмена</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 72,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  triggerText: {color: colors.text, fontWeight: '600', flexShrink: 1},
  chevron: {color: colors.primary, fontWeight: '800'},
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 16, 125, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '70%',
    paddingTop: 12,
  },
  sheetTitle: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  sheetScroll: {paddingHorizontal: 8},
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionCorrect: {backgroundColor: '#F0FDF4'},
  optionText: {fontSize: 16, color: colors.text, fontWeight: '600'},
  optionTextCorrect: {color: '#059669', fontWeight: '800'},
  cancel: {alignItems: 'center', paddingVertical: 14},
  cancelText: {color: colors.muted, fontWeight: '700'},
});
