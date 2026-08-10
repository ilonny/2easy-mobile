import {useCallback, useEffect, useMemo, useState} from 'react';

import {useAuth} from '../../../entities/session';
import {
  LEVEL_FILTERS,
  matchesLevelFilter,
  matchesSearch,
  type Lesson,
  type LevelFilter,
  type LessonsTab,
} from '../../../entities/lesson';
import {fetchPublicLessons, fetchSecureLessons} from '../api/lessonsApi';

export function useLessonPlans() {
  const {isAuthorized, authIsLoading} = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All lessons');
  const [tab, setTab] = useState<LessonsTab>('twoEasy');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = isAuthorized
        ? await fetchSecureLessons()
        : await fetchPublicLessons();

      if (res.success === false) {
        setError(res.message || 'Не удалось загрузить уроки');
        return;
      }

      setLessons(res.lessons || []);
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

  const visibleLessons = useMemo(() => {
    let list = lessons;
    if (isAuthorized) {
      list =
        tab === 'my'
          ? lessons.filter(lesson => lesson.user_id !== 1)
          : lessons.filter(lesson => lesson.user_id === 1);
    }

    return list.filter(
      lesson =>
        matchesLevelFilter(lesson, levelFilter) && matchesSearch(lesson, search),
    );
  }, [isAuthorized, lessons, tab, levelFilter, search]);

  return {
    lessons: visibleLessons,
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
