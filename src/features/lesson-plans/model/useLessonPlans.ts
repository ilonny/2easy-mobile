import {useCallback, useEffect, useMemo, useState} from 'react';

import {useAuth} from '../../../entities/session';
import {
  LEVEL_FILTERS,
  TWO_EASY_USER_ID,
  matchesLevelFilter,
  matchesSearch,
  type Lesson,
  type LevelFilter,
  type LessonsTab,
} from '../../../entities/lesson';
import {fetchCourses, type Course} from '../api/coursesApi';
import {fetchPublicLessons, fetchSecureLessons} from '../api/lessonsApi';

function matchesCourseSearch(course: Course, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    course.title?.toLowerCase().includes(q) ||
    course.description?.toLowerCase().includes(q) ||
    course.tags?.toLowerCase().includes(q) ||
    false
  );
}

export function useLessonPlans() {
  const {isAuthorized, authIsLoading} = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All lessons');
  const [tab, setTab] = useState<LessonsTab>('twoEasy');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonsRes, coursesList] = await Promise.all([
        isAuthorized ? fetchSecureLessons() : fetchPublicLessons(),
        fetchCourses({isSecure: isAuthorized}).catch(() => [] as Course[]),
      ]);

      if (lessonsRes.success === false) {
        setError(lessonsRes.message || 'Не удалось загрузить уроки');
        setLessons([]);
      } else {
        setLessons(lessonsRes.lessons || []);
      }
      setCourses(coursesList);
    } catch {
      setError('Не удалось загрузить уроки');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (authIsLoading) {
      return;
    }
    setTab(isAuthorized ? 'my' : 'twoEasy');
    void load();
  }, [authIsLoading, isAuthorized, load]);

  const hasMyCourses = useMemo(
    () => courses.some(c => Number(c.user_id) !== TWO_EASY_USER_ID),
    [courses],
  );

  const hasTwoEasyCourses = useMemo(
    () => courses.some(c => Number(c.user_id) === TWO_EASY_USER_ID),
    [courses],
  );

  useEffect(() => {
    if (tab === 'twoEasyCourses' && !hasTwoEasyCourses) {
      setTab(isAuthorized ? 'my' : 'twoEasy');
    }
  }, [tab, hasTwoEasyCourses, isAuthorized]);

  const isCoursesTab = tab === 'myCourses' || tab === 'twoEasyCourses';
  const isBoardsTab = tab === 'myBoards';

  const visibleLessons = useMemo(() => {
    if (isCoursesTab || isBoardsTab) {
      return [] as Lesson[];
    }
    let list = lessons;
    if (isAuthorized) {
      list =
        tab === 'my'
          ? lessons.filter(lesson => Number(lesson.user_id) !== TWO_EASY_USER_ID)
          : lessons.filter(lesson => Number(lesson.user_id) === TWO_EASY_USER_ID);
    }

    return list.filter(
      lesson =>
        matchesLevelFilter(lesson, levelFilter) && matchesSearch(lesson, search),
    );
  }, [isAuthorized, lessons, tab, levelFilter, search, isCoursesTab, isBoardsTab]);

  const visibleCourses = useMemo(() => {
    if (!isCoursesTab || isBoardsTab) {
      return [] as Course[];
    }
    const list =
      tab === 'myCourses'
        ? courses.filter(c => Number(c.user_id) !== TWO_EASY_USER_ID)
        : courses.filter(c => Number(c.user_id) === TWO_EASY_USER_ID);

    return list.filter(course => matchesCourseSearch(course, search));
  }, [courses, tab, search, isCoursesTab, isBoardsTab]);

  return {
    lessons: visibleLessons,
    courses: visibleCourses,
    isCoursesTab,
    isBoardsTab,
    hasMyCourses,
    hasTwoEasyCourses,
    loading: loading || authIsLoading,
    error,
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    tab,
    setTab,
    levelFilters: LEVEL_FILTERS,
    reload: load,
    isAuthorized,
  };
}
