import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button} from '../../../shared/ui';
import {copyExercise, fetchExList} from '../../lesson-player/api/lessonApi';
import {getExDisplayInfo, positiveId, type HomeworkExRow} from '../lib/exDisplay';

type Props = {
  visible: boolean;
  /** Homework lesson that receives the copied exercises */
  homeworkLessonId: number;
  /** Parent lesson to pick exercises from */
  parentLessonId: number;
  /** Current last sortIndex in the homework lesson */
  lastSortIndex: number;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddExercisesFromLessonModal({
  visible,
  homeworkLessonId,
  parentLessonId,
  lastSortIndex,
  onClose,
  onSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  const [chosenExIds, setChosenExIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exListLoading, setExListLoading] = useState(false);
  const [error, setError] = useState('');
  const [exList, setExList] = useState<HomeworkExRow[]>([]);

  const sortedExList = useMemo(
    () =>
      [...exList]
        .filter(ex => ex.type !== 'note')
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0)),
    [exList],
  );

  useEffect(() => {
    if (!visible) {
      setChosenExIds([]);
      setError('');
      return;
    }
    if (!parentLessonId) {
      return;
    }

    let cancelled = false;
    setExListLoading(true);
    void (async () => {
      try {
        const list = await fetchExList(parentLessonId);
        if (!cancelled) {
          setExList(
            list.map(ex => ({
              id: ex.id,
              type: ex.type,
              data: ex.data,
              sortIndex: ex.sortIndex,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setExList([]);
          setError(t('lessons.homeworkOpenFailed'));
        }
      } finally {
        if (!cancelled) {
          setExListLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, parentLessonId, t]);

  const toggle = useCallback((id: number) => {
    setChosenExIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : ids.concat(id),
    );
  }, []);

  const onSubmit = async () => {
    const hwId = positiveId(homeworkLessonId);
    if (!hwId || !chosenExIds.length) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const orderedIds = sortedExList
        .map(ex => ex.id)
        .filter(id => chosenExIds.includes(id));
      let sortCursor = Number(lastSortIndex) || 0;
      for (const exId of orderedIds) {
        await copyExercise({
          lesson_id: hwId,
          id: exId,
          currentSortIndexToShift: sortCursor,
        });
        sortCursor += 1;
      }
      onClose();
      onSuccess?.();
    } catch {
      setError(t('editor.saveFailed'));
    } finally {
      setIsLoading(false);
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
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {t('modals.addTasksFromLessonTitle')}
            </Text>
            <Text style={styles.subtitle}>
              {t('modals.addTasksFromLessonHint')}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {exListLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.hint}>{t('modals.homeworkLoadingTasks')}</Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.listFlex}
              contentContainerStyle={[
                styles.content,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom: 16,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
              {sortedExList.length > 0
                ? sortedExList.map(ex => {
                    const {typeLabel, title, description} = getExDisplayInfo(
                      ex,
                      t,
                    );
                    const selected = chosenExIds.includes(ex.id);
                    return (
                      <Pressable
                        key={ex.id}
                        onPress={() => toggle(ex.id)}
                        style={[styles.exCard, selected && styles.exCardOn]}>
                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxOn,
                          ]}>
                          {selected ? (
                            <Text style={styles.checkMark}>✓</Text>
                          ) : null}
                        </View>
                        <View style={styles.exMeta}>
                          <Text style={styles.exType}>{typeLabel}</Text>
                          {!!title && (
                            <Text style={styles.exTitle} numberOfLines={1}>
                              {title}
                            </Text>
                          )}
                          {!!description && (
                            <Text style={styles.exDesc} numberOfLines={2}>
                              {description}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                : (
                  <Text style={styles.hint}>
                    {t('modals.addTasksFromLessonEmpty')}
                  </Text>
                )}
            </ScrollView>
            <View
              style={[
                styles.footerBar,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom: insets.bottom + 16,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button
                title={t('modals.addTasksFromLessonSubmit')}
                onPress={() => {
                  void onSubmit();
                }}
                loading={isLoading}
                disabled={!chosenExIds.length}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    gap: 12,
  },
  headerText: {flex: 1, gap: 4},
  title: {fontSize: 20, fontWeight: '800', color: colors.primary},
  subtitle: {fontSize: 14, lineHeight: 20, color: colors.textSecondary},
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  listFlex: {flex: 1},
  content: {gap: 10, paddingTop: 4},
  footerBar: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#F9F9F9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {color: colors.white, fontWeight: '800', fontSize: 13},
  exCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  exCardOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  exMeta: {flex: 1, gap: 2},
  exType: {fontSize: 12, fontWeight: '600', color: colors.muted},
  exTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  exDesc: {fontSize: 13, color: colors.textSecondary},
  hint: {color: colors.muted, textAlign: 'center', marginVertical: 8},
  error: {color: colors.danger, textAlign: 'center'},
});
