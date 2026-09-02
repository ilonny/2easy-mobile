import {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button} from '../../../shared/ui';
import {saveStartLessonSelectedIds} from '../../lesson-player/lib/startLessonSelection';
import {
  createLessonRelation,
  fetchStudents,
  type Student,
} from '../../students/api/studentsApi';

type Props = {
  visible: boolean;
  lessonId: number;
  onClose: () => void;
  onStarted: (selectedIds: number[]) => void;
  /** start = attach + open lesson; homeworkCheck = pick one student, no relation. */
  mode?: 'start' | 'homeworkCheck';
};

function shortName(name: string) {
  return name
    .split(' ')
    .map(part => part[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function StartLessonStudentsModal({
  visible,
  lessonId,
  onClose,
  onStarted,
  mode = 'start',
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const isHomeworkCheck = mode === 'homeworkCheck';
  const [students, setStudents] = useState<Student[]>([]);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchStudents();
      setStudents(list);
    } catch {
      setStudents([]);
      setError(t('lessons.startLessonLoadStudentsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      setChosenIds([]);
      setError('');
      return;
    }
    void load();
  }, [visible, load]);

  const toggle = (id: number) => {
    if (isHomeworkCheck) {
      setChosenIds(prev => (prev[0] === id ? [] : [id]));
      return;
    }
    setChosenIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id),
    );
  };

  const onSubmit = async () => {
    if (chosenIds.length === 0) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (!isHomeworkCheck) {
        await Promise.all(
          chosenIds.map(student_id =>
            createLessonRelation({
              lesson_id: lessonId,
              student_id,
              status: 'open',
            }),
          ),
        );
      }
      await saveStartLessonSelectedIds(chosenIds);
      onStarted(chosenIds);
    } catch {
      setError(
        isHomeworkCheck
          ? t('lessons.homeworkOpenFailed')
          : t('lessons.startLessonAttachFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title = isHomeworkCheck
    ? t('lessons.checkHomework')
    : t('lessons.startLesson');
  const subtitle = isHomeworkCheck
    ? t('lessons.chooseStudentToCheckHomework')
    : t('lessons.chooseStudentsToStart');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <FlatList
              data={students}
              keyExtractor={item => String(item.id)}
              style={styles.listFlex}
              contentContainerStyle={[
                styles.list,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom: 16,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                  flexGrow: 1,
                },
              ]}
              ListEmptyComponent={
                <Text style={styles.empty}>{t('students.noStudents')}</Text>
              }
              renderItem={({item}) => {
                const selected = chosenIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() => toggle(item.id)}
                    style={[
                      styles.card,
                      selected && styles.cardSelected,
                      isTablet && styles.cardTablet,
                    ]}>
                    <View
                      style={[styles.avatar, selected && styles.avatarSelected]}>
                      <Text style={styles.avatarText}>
                        {shortName(item.name) || 'A'}
                      </Text>
                    </View>
                    <View style={styles.meta}>
                      <Text style={styles.name}>{item.name}</Text>
                      {!!item.email && (
                        <Text style={styles.email}>{item.email}</Text>
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
                title={title}
                onPress={() => {
                  void onSubmit();
                }}
                loading={submitting}
                disabled={chosenIds.length === 0}
              />
              <Pressable onPress={onClose} style={styles.cancelWrap}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  listFlex: {flex: 1},
  list: {paddingTop: 8, gap: 10},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardTablet: {minHeight: 72},
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {backgroundColor: colors.white},
  avatarText: {fontWeight: '700', color: '#4031C3', fontSize: 15},
  meta: {flex: 1, gap: 2},
  name: {fontWeight: '700', fontSize: 16, color: colors.text},
  email: {fontSize: 13, color: colors.muted},
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
  checkMark: {color: colors.white, fontWeight: '800', fontSize: 14},
  footerBar: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#F9F9F9',
  },
  error: {color: colors.danger, textAlign: 'center'},
  cancelWrap: {alignItems: 'center', paddingVertical: 8},
  cancel: {color: colors.muted, fontWeight: '600'},
});
