import {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {TWO_EASY_USER_ID, type Lesson} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {catalogTileWidth, useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {AppDialog, Breadcrumbs} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {useSubscription} from '../../home/model/useSubscription';
import {
  CreateIndividualHomeworkModal,
  openStudentHomework,
  openTeacherStudentHomework,
  positiveId,
  resolveHomeworkForStudentBatch,
  startHomeworkSessionForStudent,
} from '../../homework';
import {
  fetchCourseLessons,
  fetchCourses,
  type Course,
} from '../../lesson-plans/api/coursesApi';
import {LessonCard} from '../../lesson-plans/ui/LessonCard';
import {saveStartLessonSelectedIds} from '../../lesson-player/lib/startLessonSelection';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  courseId: number;
  studentId: number;
};

export function StudentCourseScreen({courseId, studentId}: Props) {
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

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvedHw, setResolvedHw] = useState<
    Record<number, {homework_lesson_id?: number; has_individual_homework?: boolean}>
  >({});
  const [createHwLesson, setCreateHwLesson] = useState<Lesson | null>(null);
  const [hwBusyId, setHwBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [courses, courseLessons] = await Promise.all([
        fetchCourses({isSecure: true, studentId}),
        fetchCourseLessons(courseId, studentId),
      ]);
      setCourse(courses.find(c => Number(c.id) === Number(courseId)) || null);
      const visible = profile?.isStudent
        ? courseLessons.filter(
            lesson => lesson['lesson_relations.status'] !== 'close',
          )
        : courseLessons;
      setLessons(visible);

      if (isTeacher && visible.length > 0) {
        try {
          const batch = await resolveHomeworkForStudentBatch(
            visible.map(l => l.id),
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
      setCourse(null);
      setLessons([]);
      setResolvedHw({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, studentId, profile?.isStudent, isTeacher]);

  useEffect(() => {
    void load();
  }, [load]);

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
          setNotice(t('lessons.homeworkOpenFailed'));
          return;
        }
        setCreateHwLesson(lesson);
        return;
      }

      if (isStudentSelf && (homeworkExistsForLesson(lesson) || is2easy)) {
        const hwId = await openStudentHomework({
          lesson: {
            ...lesson,
            homework_lesson_id: knownId || lesson.homework_lesson_id,
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
        setNotice(t('lessons.homeworkOpenFailed'));
      }
    } catch {
      setNotice(t('lessons.homeworkOpenFailed'));
    } finally {
      setHwBusyId(null);
    }
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
      ) : (
        <FlatList
          key={`cols-${catalogColumns}`}
          data={lessons}
          keyExtractor={item => String(item.id)}
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
              <Breadcrumbs
                items={[
                  {
                    label: t('students.studentCabinet'),
                    onPress: () => navigation.goBack(),
                  },
                  {label: course?.title || t('lessons.course')},
                ]}
              />
              <Text style={styles.title}>
                {course?.title || t('lessons.course')}
              </Text>
            </View>
          }
          renderItem={({item}) => {
            const locked = item['lesson_relations.status'] === 'close';
            const is2easy = Number(item.user_id) === TWO_EASY_USER_ID;
            const hwExists = homeworkExistsForLesson(item);
            const showHwAction =
              (isTeacher && !locked) ||
              (isStudentSelf && (hwExists || is2easy));
            return (
              <View style={{width: tileWidth, marginBottom: tileGap}}>
                <LessonCard
                  item={item}
                  locked={locked}
                  onPress={() => {
                    if (locked && profile?.isStudent) {
                      return;
                    }
                    if (isTeacher && !requireTeacherSubscription()) {
                      return;
                    }
                    if (isTeacher) {
                      void saveStartLessonSelectedIds([studentId]);
                    }
                    navigation.getParent()?.navigate('Lessons', {
                      screen: 'LessonViewer',
                      params: {
                        lessonId: item.id,
                        from: 'Lessons',
                        studentId: isTeacher ? studentId : undefined,
                      },
                    });
                  }}
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
                          void onHomeworkPress(item);
                        }
                      : undefined
                  }
                  actionLoading={hwBusyId === item.id}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('students.noLessons')}</Text>
          }
        />
      )}

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

      <AppDialog
        visible={!!notice}
        message={notice}
        onClose={() => setNotice('')}
        actions={[
          {
            label: t('common.close'),
            variant: 'ghost',
            onPress: () => setNotice(''),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {paddingHorizontal: 16, paddingBottom: 8},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {paddingTop: 8},
  intro: {gap: 12, marginBottom: 12},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  row: {flexDirection: 'row'},
  empty: {textAlign: 'center', color: colors.muted, marginTop: 24},
});
