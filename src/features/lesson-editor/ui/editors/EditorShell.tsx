import {type ReactNode} from 'react';
import {
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

import {CreateExWithAiButton} from '../../../ai/ui/CreateExWithAiButton';
import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {useLayout} from '../../../../shared/lib/layout';
import {useKeyboardBottomOffset} from '../../../../shared/lib/useKeyboardBottomOffset';
import {Button} from '../../../../shared/ui';
import {ExercisePreview} from './ExercisePreview';

export type EditorAiProps = {
  type: string;
  currentData: Record<string, unknown>;
  onApply: (data: Record<string, unknown>) => void;
  lessonId?: number;
  lessonContext?: {
    title?: string;
    description?: string;
    tags?: string;
  };
};

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
  /** Exercise type for live preview at the bottom (site parity). */
  previewType?: string;
  previewData?: Record<string, unknown>;
  previewLessonId?: number;
  /** Per-exercise AI assistant (site CreateExWithAiButton). */
  ai?: EditorAiProps;
};

export function EditorShell({
  visible,
  title,
  onClose,
  onSave,
  saving,
  children,
  previewType,
  previewData,
  previewLessonId,
  ai,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {isTablet, authFormMaxWidth, pageGutter} = useLayout();
  const keyboardHeight = useKeyboardBottomOffset(visible);

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
          <View
            style={[
              styles.header,
              {paddingHorizontal: pageGutter},
              isTablet && styles.headerTablet,
            ]}>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{t('editor.exerciseEditor')}</Text>
              <Text
                style={[styles.title, isTablet && styles.titleTablet]}
                numberOfLines={2}>
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, isTablet && styles.closeBtnTablet]}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.body,
              {
                paddingHorizontal: pageGutter,
                paddingBottom:
                  insets.bottom +
                  48 +
                  (keyboardHeight > 0 ? 24 : 0) +
                  (Platform.OS === 'android' ? keyboardHeight : 0),
              },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="always">
            <View
              style={[
                styles.formColumn,
                {
                  maxWidth: authFormMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
              {ai ? (
                <CreateExWithAiButton
                  type={ai.type}
                  currentData={ai.currentData}
                  onApply={ai.onApply}
                  lessonId={ai.lessonId}
                  lessonContext={ai.lessonContext}
                />
              ) : null}
              {children}
              {!!previewType && !!previewData && (
                <View style={styles.previewBlock}>
                  <Text style={styles.previewLabel}>{t('editor.preview')}</Text>
                  <ExercisePreview
                    type={previewType}
                    data={previewData}
                    lessonId={previewLessonId}
                  />
                </View>
              )}
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
  headerTablet: {paddingBottom: 18},
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
  titleTablet: {fontSize: 24},
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTablet: {width: 44, height: 44, borderRadius: 22},
  close: {fontSize: 16, color: colors.muted, fontWeight: '700'},
  body: {paddingVertical: 16, gap: 4},
  formColumn: {gap: 4},
  previewBlock: {
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
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
