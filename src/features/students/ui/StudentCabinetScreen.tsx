import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {
  TWO_EASY_USER_ID,
  type Lesson,
  type LessonRelationStatus,
} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {catalogTileWidth, useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome, openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {
  ActionMenuModal,
  AppDialog,
  Breadcrumbs,
  Button,
  type ActionMenuItem,
} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {useSubscription} from '../../home/model/useSubscription';
import {DictionaryModal} from '../../dictionary/ui/DictionaryModal';
import {
  CreateIndividualHomeworkModal,
  openStudentHomework,
  openTeacherStudentHomework,
  positiveId,
  resolveHomeworkForStudentBatch,
  startHomeworkSessionForStudent,
} from '../../homework';
import {fetchSecureLessons} from '../../lesson-plans/api/lessonsApi';
import {fetchCourses, type Course} from '../../lesson-plans/api/coursesApi';
import {LessonCard} from '../../lesson-plans/ui/LessonCard';
import {startLessonSession} from '../../lesson-player/api/lessonApi';
import {saveStartLessonSelectedIds} from '../../lesson-player/lib/startLessonSelection';
import {
  deleteCourseRelation,
  deleteLessonRelation,
  deleteStudent,
  editCourseRelation,
  editLessonRelation,
  fetchStudentInfo,
  type Student,
} from '../api/studentsApi';
import {AttachMaterialToStudentModal} from './AttachMaterialToStudentModal';
import {CreateStudentModal} from './CreateStudentModal';
import {StudentCard} from './StudentCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CabinetTab = 'lessons' | 'courses';

type Props = {
  studentId: number;
};

type NoticeState = {
  title?: string;
  message: string;
} | null;

type MenuTarget =
  | {kind: 'lesson'; item: Lesson}
  | {kind: 'course'; item: Course};

function statusMark(
  current: LessonRelationStatus | undefined,
  value: LessonRelationStatus,
) {
  return current === value ? '✓ ' : '';
}

export function StudentCabinetScreen({studentId}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {profile, isAuthorized} = useAuth();
  const {hasSubscription, loading: subLoading} = useSubscription();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, catalogColumns, catalogRowWidth} =
    useLayout();
  const tileGap = 12;
  const tileWidth = catalogTileWidth(catalogRowWidth, catalogColumns, tileGap);

  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const isStudentSelf =
    !!profile?.isStudent && Number(profile.studentId) === Number(studentId);

  const requireTeacherSubscription = () => {
    if (!isTeacher) {
      return true;
    }
    if (subLoading) {
      return false;
    }
    if (!hasSubscription) {
      openSectionRoute(navigation, 'Subscription', isAuthorized);
      return false;
    }
    return true;
  };

  const [tab, setTab] = useState<CabinetTab>('lessons');
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [detachTarget, setDetachTarget] = useState<MenuTarget | null>(null);
  const [resolvedHw, setResolvedHw] = useState<
    Record<number, {homework_lesson_id?: number; has_individual_homework?: boolean}>
  >({});
  const [createHwLesson, setCreateHwLesson] = useState<Lesson | null>(null);
  const [hwBusyId, setHwBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [info, lessonsRes, coursesList] = await Promise.all([
        fetchStudentInfo(studentId),
        fetchSecureLessons(studentId),
        fetchCourses({isSecure: true, studentId}),
      ]);
      setStudent(info);
      const nextLessons = lessonsRes.lessons ?? [];
      const visibleLessons = profile?.isStudent
        ? nextLessons.filter(
            lesson => lesson['lesson_relations.status'] !== 'close',
          )
        : nextLessons;
      setLessons(visibleLessons);
      setCourses(
        profile?.isStudent
          ? coursesList.filter(
              course => course['lesson_relations.status'] !== 'close',
            )
          : coursesList,
      );

      if (isTeacher && visibleLessons.length > 0) {
        try {
          const batch = await resolveHomeworkForStudentBatch(
            visibleLessons.map(l => l.id),
            studentId,
          );
          const map: Record<
            number,
            {homework_lesson_id?: number; has_individual_homework?: boolean}
          > = {};
          Object.entries(batch?.by_lesson_id || {}).forEach(([id, value]) => {
            map[Number(id)] = {
              homework_lesson_id: positiveId(value?.homework_lesson_id),
              has_individual_homework: !!value?.has_individual_homework,
            };
          });
          setResolvedHw(map);
        } catch {
          setResolvedHw({});
        }
      } else {
        setResolvedHw({});
      }
    } catch {
      setStudent(null);
      setLessons([]);
      setCourses([]);
      setResolvedHw({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, profile?.isStudent, isTeacher]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return lessons;
    }
    return lessons.filter(l => l.title?.toLowerCase().includes(q));
  }, [lessons, search]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return courses;
    }
    return courses.filter(c => c.title?.toLowerCase().includes(q));
  }, [courses, search]);

  const listData = (tab === 'lessons' ? filteredLessons : filteredCourses) as Array<
    Lesson | Course
  >;

  const onConfirmDeleteStudent = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteStudent(pendingDelete.id);
      if (res.success === false) {
        setPendingDelete(null);
        setNotice({message: res.message || 'Error'});
        return;
      }
      setPendingDelete(null);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('StudentsList');
      }
    } finally {
      setDeleting(false);
    }
  };

  const changeStatus = async (
    target: MenuTarget,
    status: LessonRelationStatus,
  ) => {
    const relationId = target.item['lesson_relations.id'];
    if (!relationId) {
      setNotice({message: t('lessons.statusUpdateFailed')});
      return;
    }
    const res =
      target.kind === 'course'
        ? await editCourseRelation({
            relation_id: relationId,
            status: status === 'complete' ? 'open' : status,
          })
        : await editLessonRelation({relation_id: relationId, status});
    if (res.success === false) {
      setNotice({message: res.message || t('lessons.statusUpdateFailed')});
      return;
    }
    await load();
  };

  const onConfirmDetach = async () => {
    if (!detachTarget) {
      return;
    }
    const relationId = detachTarget.item['lesson_relations.id'];
    if (!relationId) {
      setDetachTarget(null);
      setNotice({message: t('lessons.detachFailed')});
      return;
    }
    const res =
      detachTarget.kind === 'course'
        ? await deleteCourseRelation(relationId)
        : await deleteLessonRelation(relationId);
    setDetachTarget(null);
    if (res.success === false) {
      setNotice({message: res.message || t('lessons.detachFailed')});
      return;
    }
    await load();
  };

  const menuItems: ActionMenuItem[] = useMemo(() => {
    if (!menuTarget || !isTeacher) {
      return [];
    }
    const status = menuTarget.item['lesson_relations.status'];
    const items: ActionMenuItem[] = [
      {
        label: `${statusMark(status, 'open')}${t('lessons.statusOpen')}`,
        onPress: () => {
          void changeStatus(menuTarget, 'open');
        },
      },
      {
        label: `${statusMark(status, 'close')}${t('lessons.statusClosed')}`,
        onPress: () => {
          void changeStatus(menuTarget, 'close');
        },
      },
    ];
    if (menuTarget.kind === 'lesson') {
      items.push({
        label: `${statusMark(status, 'complete')}${t('lessons.statusComplete')}`,
        onPress: () => {
          void changeStatus(menuTarget, 'complete');
        },
      });
    }
    items.push({
      label: t('lessons.deleteFromStudent'),
      destructive: true,
      onPress: () => setDetachTarget(menuTarget),
    });
    return items;
    // changeStatus closes over load/t — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuTarget, isTeacher, t]);

  const crumbs = isTeacher
    ? [
        {
          label: t('editor.home'),
          onPress: () => goHome(navigation as never, true, profile),
        },
        {
          label: t('profile.myStudents'),
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('StudentsList');
            }
          },
        },
        {label: student?.name || t('common.loading')},
      ]
    : [];

  const openLesson = async (item: Lesson) => {
    if (!(isTeacher || isStudentSelf)) {
      return;
    }
    if (isTeacher && !requireTeacherSubscription()) {
      return;
    }
    if (item['lesson_relations.status'] === 'close' && isStudentSelf) {
      return;
    }
    let sessionId: number | undefined;
    if (isTeacher) {
      await saveStartLessonSelectedIds([studentId]);
      const response = await startLessonSession(item.id, [studentId]);
      sessionId = positiveId(response?.session?.id);
      if (!sessionId) {
        setNotice({message: response?.message || t('common.error')});
        return;
      }
    }
    navigation.getParent()?.navigate('Lessons', {
      screen: 'LessonViewer',
      params: {
        lessonId: item.id,
        from: 'Lessons',
        studentId: isTeacher ? studentId : undefined,
        sessionId,
      },
    });
  };

  const openHomeworkViewer = (homeworkLessonId: number) => {
    void (async () => {
      const sessionId = isTeacher
        ? await startHomeworkSessionForStudent(homeworkLessonId, studentId)
        : undefined;
      navigation.getParent()?.navigate('Lessons', {
        screen: 'LessonViewer',
        params: {
          lessonId: homeworkLessonId,
          from: 'Lessons',
          studentId: isTeacher ? studentId : undefined,
          ...(sessionId ? {sessionId} : {}),
        },
      });
    })();
  };

  const homeworkExistsForLesson = (lesson: Lesson) => {
    const is2easy = Number(lesson.user_id) === TWO_EASY_USER_ID;
    const resolved = resolvedHw[lesson.id];
    const individualId =
      (resolved?.has_individual_homework
        ? positiveId(resolved.homework_lesson_id)
        : undefined) ||
      (lesson.has_individual_homework
        ? positiveId(lesson.homework_lesson_id)
        : undefined);

    if (is2easy) {
      return individualId != null;
    }
    if (resolved) {
      if (positiveId(resolved.homework_lesson_id)) {
        return true;
      }
      if (resolved.has_individual_homework) {
        return true;
      }
    }
    return !!(
      positiveId(lesson.homework_lesson_id) || lesson.has_individual_homework
    );
  };

  const onHomeworkPress = async (lesson: Lesson) => {
    if (isTeacher && !requireTeacherSubscription()) {
      return;
    }
    const is2easy = Number(lesson.user_id) === TWO_EASY_USER_ID;
    const resolved = resolvedHw[lesson.id];
    const knownId =
      (resolved?.has_individual_homework
        ? positiveId(resolved.homework_lesson_id)
        : undefined) ||
      (lesson.has_individual_homework
        ? positiveId(lesson.homework_lesson_id)
        : undefined);

    setHwBusyId(lesson.id);
    try {
      if (isTeacher) {
        if (knownId || homeworkExistsForLesson(lesson)) {
          const hwId = await openTeacherStudentHomework({
            lessonId: lesson.id,
            studentId,
            knownHomeworkId: knownId,
          });
          if (hwId) {
            openHomeworkViewer(hwId);
            return;
          }
          setNotice({message: t('lessons.homeworkOpenFailed')});
          return;
        }
        setCreateHwLesson(lesson);
        return;
      }

      if (isStudentSelf && (homeworkExistsForLesson(lesson) || is2easy)) {
        const hwId = await openStudentHomework({
          lesson: {
            ...lesson,
            homework_lesson_id:
              knownId || lesson.homework_lesson_id,
            has_individual_homework:
              resolved?.has_individual_homework ||
              lesson.has_individual_homework,
          },
          studentId,
        });
        if (hwId) {
          openHomeworkViewer(hwId);
          return;
        }
        setNotice({message: t('lessons.homeworkOpenFailed')});
      }
    } catch {
      setNotice({message: t('lessons.homeworkOpenFailed')});
    } finally {
      setHwBusyId(null);
    }
  };

  const openCourse = (item: Course) => {
    if (!(isTeacher || isStudentSelf)) {
      return;
    }
    if (item['lesson_relations.status'] === 'close' && isStudentSelf) {
      return;
    }
    navigation.navigate('StudentCourse', {courseId: item.id, studentId});
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !student ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{t('lessonPlans.empty')}</Text>
          {isTeacher ? (
            <Button
              title={t('students.allStudents')}
              onPress={() => navigation.navigate('StudentsList')}
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          key={`cols-${catalogColumns}`}
          data={listData}
          keyExtractor={item => `${tab}-${item.id}`}
          numColumns={catalogColumns}
          columnWrapperStyle={[styles.row, {gap: tileGap}]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal: pageGutter,
              paddingBottom: 32,
              maxWidth: pageContentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Breadcrumbs items={crumbs} />
              <Text style={styles.title}>{t('students.studentCabinet')}</Text>

              {isTeacher ? (
                <StudentCard
                  student={student}
                  hideCabinetAction
                  onOpenCabinet={() => undefined}
                  onEdit={() => {
                    if (!requireTeacherSubscription()) {
                      return;
                    }
                    setEditOpen(true);
                  }}
                  onDelete={item => {
                    if (!requireTeacherSubscription()) {
                      return;
                    }
                    setPendingDelete(item);
                  }}
                />
              ) : (
                <View style={styles.selfCard}>
                  <Text style={styles.selfName}>{student.name}</Text>
                  {!!student.email && (
                    <Text style={styles.selfEmail}>{student.email}</Text>
                  )}
                  {!!student.tag && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{student.tag}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.tabs}>
                <Pressable
                  onPress={() => setTab('lessons')}
                  style={[styles.tab, tab === 'lessons' && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      tab === 'lessons' && styles.tabTextActive,
                    ]}>
                    {t('lessons.lessonsTab')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTab('courses')}
                  style={[styles.tab, tab === 'courses' && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      tab === 'courses' && styles.tabTextActive,
                    ]}>
                    {t('lessons.coursesTab')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDictionaryOpen(true)}
                  style={styles.tab}>
                  <Text style={styles.tabText}>{t('dictionary.tab')}</Text>
                </Pressable>
              </View>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={
                  tab === 'courses'
                    ? t('lessons.searchCourses')
                    : t('students.searchLessons')
                }
                placeholderTextColor={colors.muted}
                style={styles.search}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />

              {isTeacher ? (
                <Button
                  title={t('lessons.attachToStudent')}
                  onPress={() => {
                    if (!requireTeacherSubscription()) {
                      return;
                    }
                    setAttachOpen(true);
                  }}
                />
              ) : null}
            </View>
          }
          renderItem={({item}) => {
            const locked = item['lesson_relations.status'] === 'close';
            const isLessonRow = tab === 'lessons';
            const lessonItem = item as Lesson;
            const is2easy =
              isLessonRow && Number(lessonItem.user_id) === TWO_EASY_USER_ID;
            const showHwAction =
              isLessonRow &&
              ((isTeacher && !locked) ||
                (isStudentSelf &&
                  (homeworkExistsForLesson(lessonItem) || is2easy)));
            const hwExists = isLessonRow && homeworkExistsForLesson(lessonItem);
            return (
              <View style={{width: tileWidth, marginBottom: tileGap}}>
                <LessonCard
                  item={item}
                  locked={locked}
                  onPress={() => {
                    if (tab === 'courses') {
                      openCourse(item as Course);
                    } else {
                      void openLesson(item as Lesson);
                    }
                  }}
                  onMenuPress={
                    isTeacher
                      ? () => {
                          if (!requireTeacherSubscription()) {
                            return;
                          }
                          setMenuTarget(
                            tab === 'courses'
                              ? {kind: 'course', item: item as Course}
                              : {kind: 'lesson', item: item as Lesson},
                          );
                        }
                      : undefined
                  }
                  actionLabel={
                    showHwAction
                      ? isTeacher && !hwExists
                        ? t('lessons.createHomework')
                        : t('lessons.homeworkLabel')
                      : undefined
                  }
                  onActionPress={
                    showHwAction
                      ? () => {
                          void onHomeworkPress(lessonItem);
                        }
                      : undefined
                  }
                  actionLoading={hwBusyId === lessonItem.id}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'courses'
                ? t('lessons.noCourses')
                : t('students.noLessons')}
            </Text>
          }
        />
      )}

      {isTeacher && student ? (
        <CreateStudentModal
          visible={editOpen}
          student={student}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            void load();
          }}
        />
      ) : null}

      {isTeacher ? (
        <AttachMaterialToStudentModal
          visible={attachOpen}
          studentId={studentId}
          onClose={() => setAttachOpen(false)}
          onAttached={() => {
            setAttachOpen(false);
            setNotice({message: t('lessons.attachSuccess')});
            void load();
          }}
        />
      ) : null}

      {!!createHwLesson && (
        <CreateIndividualHomeworkModal
          visible={!!createHwLesson}
          lessonId={createHwLesson.id}
          studentId={studentId}
          onClose={() => setCreateHwLesson(null)}
          onOpenViewer={hwId => {
            setCreateHwLesson(null);
            openHomeworkViewer(hwId);
          }}
          onSuccess={() => {
            void load();
          }}
        />
      )}

      <DictionaryModal
        visible={dictionaryOpen}
        studentId={studentId}
        onClose={() => setDictionaryOpen(false)}
      />

      <ActionMenuModal
        visible={!!menuTarget}
        title={
          menuTarget?.kind === 'course'
            ? t('lessons.lessonStatusCourse')
            : t('lessons.lessonStatusLesson')
        }
        items={menuItems}
        cancelLabel={t('common.cancel')}
        onClose={() => setMenuTarget(null)}
      />

      <AppDialog
        visible={!!pendingDelete}
        title={t('common.delete')}
        message={t('students.deleteStudentConfirm').replace(
          '{{name}}',
          pendingDelete?.name || '',
        )}
        onClose={() => (!deleting ? setPendingDelete(null) : undefined)}
        closeOnBackdrop={!deleting}
        actions={[
          {
            label: t('common.delete'),
            variant: 'danger',
            loading: deleting,
            onPress: () => {
              void onConfirmDeleteStudent();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setPendingDelete(null),
          },
        ]}
      />

      <AppDialog
        visible={!!detachTarget}
        title={t('lessons.deleteFromStudent')}
        message={t('lessons.deleteFromStudentConfirm').replace(
          '{{title}}',
          detachTarget?.item.title || '',
        )}
        onClose={() => setDetachTarget(null)}
        actions={[
          {
            label: t('lessons.deleteFromStudent'),
            variant: 'danger',
            onPress: () => {
              void onConfirmDetach();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setDetachTarget(null),
          },
        ]}
      />

      <AppDialog
        visible={!!notice}
        message={notice?.message}
        title={notice?.title}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {paddingHorizontal: 16, paddingBottom: 8},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  error: {color: colors.danger, textAlign: 'center'},
  list: {paddingTop: 8},
  intro: {gap: 12, marginBottom: 12},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  selfCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  selfName: {fontSize: 18, fontWeight: '700', color: colors.text},
  selfEmail: {fontSize: 14, color: colors.muted},
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  tagText: {fontSize: 12, color: '#B45309', fontWeight: '600'},
  tabs: {flexDirection: 'row', gap: 8},
  tab: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tabText: {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  tabTextActive: {color: colors.primary},
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
  row: {flexDirection: 'row'},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 24,
  },
});
