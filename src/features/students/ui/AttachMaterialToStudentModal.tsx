import {useCallback, useEffect, useMemo, useState} from 'react';
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
import {fetchSecureLessons} from '../../lesson-plans/api/lessonsApi';
import {fetchCourses, type Course} from '../../lesson-plans/api/coursesApi';
import type {Lesson} from '../../../entities/lesson';
import {
  createCourseRelation,
  createLessonRelation,
} from '../api/studentsApi';

type Kind = 'lesson' | 'course';
type RelationStatus = 'open' | 'close';

type Props = {
  visible: boolean;
  studentId: number;
  onClose: () => void;
  onAttached: () => void;
};

export function AttachMaterialToStudentModal({
  visible,
  studentId,
  onClose,
  onAttached,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  const [kind, setKind] = useState<Kind>('lesson');
  const [step, setStep] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [status, setStatus] = useState<RelationStatus>('open');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonsRes, coursesList] = await Promise.all([
        fetchSecureLessons(),
        fetchCourses({isSecure: true}),
      ]);
      setLessons(lessonsRes.lessons ?? []);
      setCourses(coursesList.filter(c => Number(c.user_id) !== 1));
    } catch {
      setLessons([]);
      setCourses([]);
      setError(t('lessons.loadCoursesFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      setKind('lesson');
      setStep(0);
      setChosenIds([]);
      setStatus('open');
      setError('');
      return;
    }
    void load();
  }, [visible, load]);

  const list = useMemo(
    () =>
      (kind === 'lesson' ? lessons : courses).map(item => ({
        id: item.id,
        title: item.title || `#${item.id}`,
      })),
    [kind, lessons, courses],
  );

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
        chosenIds.map(id =>
          kind === 'course'
            ? createCourseRelation({
                lesson_id: id,
                student_id: studentId,
                status,
              })
            : createLessonRelation({
                lesson_id: id,
                student_id: studentId,
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
          <Text style={styles.title}>
            {step === 0
              ? t('lessons.attachToStudent')
              : kind === 'course'
                ? t('lessons.attachStatusCourse')
                : t('lessons.attachStatusLesson')}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {step === 0 ? (
          <View style={[styles.kindTabs, {paddingHorizontal: pageGutter}]}>
            <Pressable
              onPress={() => {
                setKind('lesson');
                setChosenIds([]);
              }}
              style={[styles.kindTab, kind === 'lesson' && styles.kindTabActive]}>
              <Text
                style={[
                  styles.kindTabText,
                  kind === 'lesson' && styles.kindTabTextActive,
                ]}>
                {t('lessons.lessonsTab')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setKind('course');
                setChosenIds([]);
              }}
              style={[styles.kindTab, kind === 'course' && styles.kindTabActive]}>
              <Text
                style={[
                  styles.kindTabText,
                  kind === 'course' && styles.kindTabTextActive,
                ]}>
                {t('lessons.coursesTab')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : step === 0 ? (
          <>
            <FlatList
              data={list}
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
                },
              ]}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {kind === 'course'
                    ? t('lessons.noCourses')
                    : t('students.noLessons')}
                </Text>
              }
              renderItem={({item}) => {
                const selected = chosenIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() => toggle(item.id)}
                    style={[styles.card, selected && styles.cardSelected]}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title || `#${item.id}`}
                    </Text>
                    <View
                      style={[styles.check, selected && styles.checkSelected]}>
                      {selected ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : null}
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
                title={t('lessons.next')}
                onPress={() => setStep(1)}
                disabled={!chosenIds.length}
              />
            </View>
          </>
        ) : (
          <>
            <View
              style={[
                styles.statusWrap,
                {
                  paddingHorizontal: pageGutter,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
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
                  {kind === 'course'
                    ? t('lessons.courseOpen')
                    : t('lessons.lessonOpen')}
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
                  {kind === 'course'
                    ? t('lessons.courseClosed')
                    : t('lessons.lessonClosed')}
                </Text>
              </Pressable>
            </View>
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
                title={t('lessons.attachToStudent')}
                loading={submitting}
                onPress={() => {
                  void onSubmit();
                }}
              />
              <Button
                title={t('common.back')}
                variant="secondary"
                disabled={submitting}
                onPress={() => setStep(0)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: {flex: 1, fontSize: 22, fontWeight: '800', color: colors.primary},
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  kindTabs: {flexDirection: 'row', gap: 8, marginBottom: 12},
  kindTab: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kindTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  kindTabText: {fontWeight: '600', color: colors.textSecondary},
  kindTabTextActive: {color: colors.primary},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  listFlex: {flex: 1},
  list: {gap: 10, paddingTop: 4},
  empty: {textAlign: 'center', color: colors.muted, marginTop: 40},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardTitle: {flex: 1, fontWeight: '700', fontSize: 15, color: colors.text},
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
  footerBar: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#F9F9F9',
  },
  error: {color: colors.danger, textAlign: 'center'},
  statusWrap: {flex: 1, gap: 12, paddingTop: 8},
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
  statusTitle: {fontWeight: '700', fontSize: 16, color: colors.text},
  statusTitleActive: {color: colors.primary},
});
