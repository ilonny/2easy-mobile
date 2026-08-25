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
import {
  createLessonRelation,
  fetchStudents,
  type Student,
} from '../../students/api/studentsApi';

type Props = {
  visible: boolean;
  lessonId: number;
  lessonTitle?: string;
  onClose: () => void;
  onAttached: () => void;
};

type RelationStatus = 'open' | 'close';

function shortName(name: string) {
  return name
    .split(' ')
    .map(part => part[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AttachLessonToStudentsModal({
  visible,
  lessonId,
  lessonTitle,
  onClose,
  onAttached,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [status, setStatus] = useState<RelationStatus>('open');
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
      setStep(0);
      setStatus('open');
      setError('');
      return;
    }
    void load();
  }, [visible, load]);

  const toggle = (id: number) => {
    setChosenIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id),
    );
  };

  const onSubmit = async () => {
    if (!chosenIds.length) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await Promise.all(
        chosenIds.map(student_id =>
          createLessonRelation({
            lesson_id: lessonId,
            student_id,
            status,
          }),
        ),
      );
      onAttached();
    } catch {
      setError(t('lessons.attachFailed'));
    } finally {
      setSubmitting(false);
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
              {step === 0
                ? t('lessons.attachToStudent')
                : t('lessons.attachStatusLesson')}
            </Text>
            {!!lessonTitle && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {lessonTitle}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : step === 0 ? (
          <FlatList
            data={students}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[
              styles.list,
              {
                paddingHorizontal: pageGutter,
                paddingBottom: insets.bottom + 24,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
                flexGrow: 1,
              },
            ]}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('students.noStudents')}</Text>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button
                  title={t('lessons.next')}
                  onPress={() => setStep(1)}
                  disabled={!chosenIds.length}
                />
                <Pressable onPress={onClose} style={styles.cancelWrap}>
                  <Text style={styles.cancel}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
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
        ) : (
          <View
            style={[
              styles.statusWrap,
              {
                paddingHorizontal: pageGutter,
                paddingBottom: insets.bottom + 24,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
              },
            ]}>
            <Text style={styles.statusHint}>
              {status === 'open'
                ? t('lessons.availableToStudent')
                : t('lessons.studentSeesLessonCannotOpen')}
            </Text>
            <Pressable
              onPress={() => setStatus('open')}
              style={[
                styles.statusCard,
                status === 'open' && styles.statusCardActive,
              ]}>
              <Text
                style={[
                  styles.statusTitle,
                  status === 'open' && styles.statusTitleActive,
                ]}>
                {t('lessons.lessonOpen')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus('close')}
              style={[
                styles.statusCard,
                status === 'close' && styles.statusCardActive,
              ]}>
              <Text
                style={[
                  styles.statusTitle,
                  status === 'close' && styles.statusTitleActive,
                ]}>
                {t('lessons.lessonClosed')}
              </Text>
            </Pressable>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button
              title={t('lessons.attachToStudent')}
              onPress={() => {
                void onSubmit();
              }}
              loading={submitting}
            />
            <Button
              title={t('common.back')}
              variant="secondary"
              onPress={() => setStep(0)}
              disabled={submitting}
            />
          </View>
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
  footer: {gap: 12, marginTop: 16},
  error: {color: colors.danger, textAlign: 'center'},
  cancelWrap: {alignItems: 'center', paddingVertical: 8},
  cancel: {color: colors.muted, fontWeight: '600'},
  statusWrap: {gap: 12, paddingTop: 8},
  statusHint: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  statusTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  statusTitleActive: {color: colors.primary},
});
