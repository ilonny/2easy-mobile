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
import type {Lesson} from '../../../entities/lesson';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Breadcrumbs} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {fetchCourseLessons, fetchCourses, type Course} from '../api/coursesApi';
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
  const {t} = useI18n();
  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tryNowVisible, setTryNowVisible] = useState(false);

  const gap = isTablet ? 16 : 12;

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
    if (isTeacher) {
      navigation.navigate('LessonEditor', {lessonId: lesson.id});
      return;
    }
    navigation.navigate('LessonViewer', {
      lessonId: lesson.id,
      from: 'Lessons',
    });
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
            data={lessons}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={[styles.row, {gap}]}
            contentContainerStyle={[
              styles.listContent,
              {paddingBottom: insets.bottom + 24},
            ]}
            renderItem={({item}) => (
              <View style={[styles.gridItem, {marginBottom: gap}]}>
                <LessonCard
                  item={item}
                  onPress={() => onPressLesson(item)}
                />
              </View>
            )}
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
    color: colors.text,
    marginTop: 4,
  },
  titleTablet: {fontSize: 34},
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  listWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  listContent: {flexGrow: 1, paddingTop: 8},
  row: {flexDirection: 'row'},
  gridItem: {flex: 1},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 48,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  error: {color: colors.danger, textAlign: 'center'},
  retry: {color: colors.primary, fontWeight: '700'},
});
