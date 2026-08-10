import {useEffect, useState, type ReactNode} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {Button} from '../../../../shared/ui';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
};

export function EditorShell({
  visible,
  title,
  onClose,
  onSave,
  saving,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={[styles.root, {paddingTop: insets.top + 8}]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{t('editor.exerciseEditor')}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.body,
              {
                paddingBottom:
                  insets.bottom + 32 + (Platform.OS === 'android' ? keyboardHeight : 0),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="always">
            {children}
            <View style={styles.footerActions}>
              <Button
                title={t('common.save')}
                onPress={onSave}
                loading={saving}
              />
              <Pressable onPress={onClose} style={styles.cancelWrap}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: '#F7F5FF'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {flex: 1, marginRight: 12, gap: 2},
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 16, color: colors.muted, fontWeight: '700'},
  body: {padding: 16, gap: 4},
  footerActions: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelWrap: {alignItems: 'center', paddingVertical: 14},
  cancel: {color: colors.muted, fontWeight: '600'},
});

export const editorStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {color: colors.text, fontWeight: '600', fontSize: 13},
  chipTextActive: {color: colors.primary},
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    gap: 6,
    backgroundColor: colors.white,
  },
  addBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
  },
  addBtnText: {color: colors.primary, fontWeight: '700'},
  removeText: {color: colors.danger, fontWeight: '600', marginTop: 4},
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
