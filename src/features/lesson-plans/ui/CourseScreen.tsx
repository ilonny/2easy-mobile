import {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {isLessonLockedOnFreeTariff, isTeacherLessonAccessBlocked, type Lesson} from '../../../entities/lesson';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {catalogTileWidth, useLayout} from '../../../shared/lib/layout';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {
  checkHomework,
  CreateHomeworkModal,
  positiveId,
} from '../../homework';
import {useSubscription} from '../../home/model/useSubscription';
import {fetchCourseLessons, fetchCourses, type Course} from '../api/coursesApi';
import {CreateCourseModal} from './CreateCourseModal';
import {LessonCard} from './LessonCard';
import {TryNowModal} from './TryNowModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  courseId: number;
};

export function CourseScreen({courseId}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {subscription, hasSubscription, loading: subLoading} = useSubscription();
  const {t} = useI18n();
  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const isStudent = !!profile?.isStudent;
  const profileUserId = Number(profile?.id || 0);
  const isFreeTariff = subscription?.subscribe_type_id === 1;
  const {isTablet, pageGutter, pageContentMaxWidth, catalogColumns, catalogRowWidth} =
    useLayout();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tryNowVisible, setTryNowVisible] = useState(false);
  const [hwCheck, setHwCheck] = useState<
    Record<number, {loaded: boolean; exists: boolean; homeworkId?: number}>
  >({});
  const [createHwLessonId, setCreateHwLessonId] = useState<number | null>(null);
  const [hwBusyId, setHwBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const gap = isTablet ? 16 : 12;
  const tileWidth = catalogTileWidth(catalogRowWidth, catalogColumns, gap);
  const isOwnCourse =
    !!course && profileUserId > 0 && Number(course.user_id) === profileUserId;

  const load = useCallback(async () => {
    setError('');
    try {
      const [courses, courseLessons] = await Promise.all([
        fetchCourses({isSecure: isAuthorized}),
        isAuthorized
          ? fetchCourseLessons(courseId)
          : Promise.resolve([] as Lesson[]),
      ]);
      const found = courses.find(c => Number(c.id) === Number(courseId)) || null;
      setCourse(found);
      setLessons(courseLessons);
      if (!found) {
        setError(t('lessonPlans.courseNotFound'));
      }
    } catch {
      setError(t('lessonPlans.loadCourseFailed'));
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, isAuthorized, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!isTeacher || !isOwnCourse || lessons.length === 0) {
      setHwCheck({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        lessons.map(async lesson => {
          try {
            const data = await checkHomework(lesson.id);
            return [
              lesson.id,
              {
                loaded: true,
                exists: !!data?.exists,
                homeworkId: positiveId(data?.first_homework_id),
              },
            ] as const;
          } catch {
            return [
              lesson.id,
              {loaded: true, exists: false},
            ] as const;
          }
        }),
      );
      if (cancelled) {
        return;
      }
      const map: Record<
        number,
        {loaded: boolean; exists: boolean; homeworkId?: number}
      > = {};
      entries.forEach(([id, value]) => {
        map[id] = value;
      });
      setHwCheck(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, isOwnCourse, lessons]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onPressLesson = (lesson: Lesson) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    if (subLoading) {
      return;
    }
    if (
      isTeacherLessonAccessBlocked(lesson, {
        isStudent,
        hasSubscription,
        isFreeTariff,
      })
    ) {
      navigation.navigate('Subscription');
      return;
    }
    if (isTeacher) {
      navigation.navigate('LessonEditor', {lessonId: lesson.id});
      return;
    }
    navigation.navigate('LessonViewer', {
      lessonId: lesson.id,
      from: 'Lessons',
    });
  };

  const onHomeworkPress = async (lesson: Lesson) => {
    if (!isStudent && (subLoading || !hasSubscription)) {
      if (!subLoading) {
        navigation.navigate('Subscription');
      }
      return;
    }
    const check = hwCheck[lesson.id];
    if (check?.exists && check.homeworkId) {
      navigation.navigate('LessonEditor', {lessonId: check.homeworkId});
      return;
    }
    setHwBusyId(lesson.id);
    try {
      const data = await checkHomework(lesson.id);
      const existingId = positiveId(data?.first_homework_id);
      if (data?.exists && existingId) {
        navigation.navigate('LessonEditor', {lessonId: existingId});
        return;
      }
      setCreateHwLessonId(lesson.id);
    } catch {
      setNotice(t('lessons.homeworkCheckFailed'));
    } finally {
      setHwBusyId(null);
    }
  };

  return (
    <View style={[styles.root, {paddingTop: insets.top + (isTablet ? 12 : 8)}]}>
      <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
        <View style={[styles.headerInner, {maxWidth: pageContentMaxWidth}]}>
          <AppHeader />
          <Breadcrumbs
            items={[
              {
                label: t('lessonPlans.title'),
                onPress: () => navigation.navigate('LessonPlans'),
              },
              {label: course?.title || t('lessonPlans.course')},
            ]}
          />
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            {course?.title || t('lessonPlans.course')}
          </Text>
          {!!course?.description && (
            <Text style={styles.description}>{course.description}</Text>
          )}
          {isTeacher && isOwnCourse ? (
            <Button
              title={t('lessons.editCourse')}
              variant="secondary"
              onPress={() => {
                if (subLoading) {
                  return;
                }
                if (!hasSubscription) {
                  navigation.navigate('Subscription');
                  return;
                }
                setEditOpen(true);
              }}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.listWrap,
          {paddingHorizontal: pageGutter, maxWidth: pageContentMaxWidth},
        ]}>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error && !course ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retry}>{t('lessonPlans.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            key={`cols-${catalogColumns}`}
            data={lessons}
            keyExtractor={item => String(item.id)}
            numColumns={catalogColumns}
            columnWrapperStyle={[styles.row, {gap}]}
            contentContainerStyle={[
              styles.listContent,
              {paddingBottom: insets.bottom + 24},
            ]}
            renderItem={({item}) => {
              const check = hwCheck[item.id];
              const showHw = isTeacher && isOwnCourse;
              const hwExists = !!(check?.exists && check.homeworkId);
              return (
                <View style={{width: tileWidth, marginBottom: gap}}>
                  <LessonCard
                    item={item}
                    locked={isLessonLockedOnFreeTariff(
                      item,
                      isFreeTariff,
                      isStudent,
                    )}
                    onPress={() => onPressLesson(item)}
                    actionLabel={
                      showHw
                        ? hwExists
                          ? t('lessons.homeworkLabel')
                          : t('lessons.createHomework')
                        : undefined
                    }
                    onActionPress={
                      showHw
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
              <Text style={styles.empty}>
                {isAuthorized
                  ? t('lessonPlans.emptyCourse')
                  : t('lessonPlans.tryNowText')}
              </Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {createHwLessonId != null ? (
        <CreateHomeworkModal
          visible={createHwLessonId != null}
          lessonId={createHwLessonId}
          onClose={() => setCreateHwLessonId(null)}
          onOpenEditor={hwId => {
            setCreateHwLessonId(null);
            navigation.navigate('LessonEditor', {lessonId: hwId});
          }}
          onSuccess={() => {
            void load();
          }}
        />
      ) : null}

      <CreateCourseModal
        visible={editOpen}
        course={course}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          void load();
        }}
      />

      <TryNowModal
        visible={tryNowVisible}
        onClose={() => setTryNowVisible(false)}
        onLogin={() => {
          setTryNowVisible(false);
          navigation.navigate('Login');
        }}
        onRegister={() => {
          setTryNowVisible(false);
          navigation.navigate('Registration');
        }}
      />

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
  root: {flex: 1, backgroundColor: '#F7F5FF'},
  header: {width: '100%'},
  headerInner: {width: '100%', alignSelf: 'center', gap: 8, marginBottom: 12},
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  titleTablet: {fontSize: 34},
  description: {fontSize: 15, lineHeight: 22, color: colors.textSecondary},
  listWrap: {flex: 1, width: '100%', alignSelf: 'center'},
  listContent: {flexGrow: 1},
  row: {flexDirection: 'row'},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  error: {color: colors.danger, textAlign: 'center'},
  retry: {color: colors.primary, fontWeight: '700'},
  empty: {textAlign: 'center', color: colors.muted, marginTop: 40},
});
