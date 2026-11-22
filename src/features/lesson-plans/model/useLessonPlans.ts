import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

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
import {fetchCatalog} from '../api/catalogApi';
import {fetchCourses, type Course} from '../api/coursesApi';
import {fetchPublicLessons, fetchSecureLessons} from '../api/lessonsApi';
import type {
  CatalogFolder,
  CatalogItem,
} from './catalogTypes';
import {isCatalogFolder} from './catalogTypes';

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

function matchesCatalogSearch(item: CatalogItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    item.title?.toLowerCase().includes(q) ||
    item.description?.toLowerCase().includes(q) ||
    item.tags?.toLowerCase().includes(q) ||
    false
  );
}

/**
 * Folder UI is additive (same BC as site):
 * - old backends without /v2/catalog → flat /lessons list, no folder chrome
 * - folder-relation / catalog probe failures never wipe the flat lesson list
 */
export function useLessonPlans() {
  const {isAuthorized, authIsLoading, profile} = useAuth();
  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [rootFolders, setRootFolders] = useState<CatalogFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [currentFolderMeta, setCurrentFolderMeta] =
    useState<CatalogFolder | null>(null);
  /** null = not probed yet; false = old backend / catalog unavailable */
  const [catalogSupported, setCatalogSupported] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All lessons');
  const [tab, setTab] = useState<LessonsTab>('twoEasy');
  const catalogRequestId = useRef(0);

  const useCatalogMode =
    isAuthorized && isTeacher && catalogSupported === true;

  const loadFlatLessonsAndCourses = useCallback(async () => {
    const [lessonsRes, coursesList] = await Promise.all([
      isAuthorized ? fetchSecureLessons() : fetchPublicLessons(),
      fetchCourses({isSecure: isAuthorized}).catch(() => [] as Course[]),
    ]);

    if (lessonsRes.success === false) {
      setError(lessonsRes.message || 'Не удалось загрузить уроки');
      setLessons([]);
    } else {
      setError('');
      setLessons(lessonsRes.lessons || []);
    }
    setCourses(coursesList);
  }, [isAuthorized]);

  const loadCatalog = useCallback(
    async (
      folderId?: number | null,
      silent?: boolean,
    ): Promise<boolean> => {
      const requestId = ++catalogRequestId.current;
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await fetchCatalog(folderId ?? null);
        if (requestId !== catalogRequestId.current) {
          return false;
        }
        if (res.success === false) {
          // Old backend without /v2/catalog (or auth/scope error): fall back to flat.
          setCatalogSupported(false);
          setCatalogItems([]);
          setRootFolders([]);
          if (folderId != null) {
            setCurrentFolderId(null);
            setCurrentFolderMeta(null);
          }
          return false;
        }
        setCatalogSupported(true);
        const items = (res.items || []) as CatalogItem[];
        // Root "Мои уроки": folders + lessons. Courses at root stay on "Мои курсы".
        const scoped =
          folderId == null
            ? items.filter(
                item => item.type === 'folder' || item.type === 'lesson',
              )
            : items;
        setCatalogItems(scoped);
        if (folderId == null) {
          setRootFolders(items.filter(isCatalogFolder));
          setCurrentFolderMeta(null);
        }
        return true;
      } catch {
        if (requestId === catalogRequestId.current) {
          // Network / missing route — same BC as site student folder-relation.
          setCatalogSupported(false);
          setCatalogItems([]);
          setRootFolders([]);
          if (folderId != null) {
            setCurrentFolderId(null);
            setCurrentFolderMeta(null);
          }
        }
        return false;
      } finally {
        if (!silent && requestId === catalogRequestId.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isAuthorized && isTeacher) {
        // Probe catalog + always keep flat /lessons (twoEasy + BC fallback).
        await Promise.all([
          loadCatalog(currentFolderId, true),
          fetchCourses({isSecure: true})
            .then(list => setCourses(list))
            .catch(() => setCourses([])),
          fetchSecureLessons()
            .then(res => {
              if (res.success === false) {
                setError(res.message || 'Не удалось загрузить уроки');
                setLessons([]);
              } else {
                setLessons(res.lessons || []);
              }
            })
            .catch(() => {
              setError('Не удалось загрузить уроки');
            }),
        ]);
      } else {
        await loadFlatLessonsAndCourses();
        setCatalogSupported(false);
        setCatalogItems([]);
        setRootFolders([]);
      }
    } catch {
      setError('Не удалось загрузить уроки');
    } finally {
      setLoading(false);
    }
  }, [
    isAuthorized,
    isTeacher,
    loadCatalog,
    loadFlatLessonsAndCourses,
    currentFolderId,
  ]);

  useEffect(() => {
    if (authIsLoading) {
      return;
    }
    setTab(isAuthorized ? 'my' : 'twoEasy');
  }, [authIsLoading, isAuthorized]);

  useEffect(() => {
    if (authIsLoading) {
      return;
    }
    void load();
  }, [authIsLoading, load]);

  const enterFolder = useCallback(
    (folder: CatalogFolder) => {
      setCurrentFolderId(folder.id);
      setCurrentFolderMeta(folder);
      void loadCatalog(folder.id);
    },
    [loadCatalog],
  );

  const leaveFolder = useCallback(() => {
    setCurrentFolderId(null);
    setCurrentFolderMeta(null);
    void loadCatalog(null);
  }, [loadCatalog]);

  const refreshCatalog = useCallback(
    async (silent?: boolean) => {
      const ok = await loadCatalog(currentFolderId, silent);
      if (!ok) {
        // Catalog disappeared mid-session — stay on flat list.
        await loadFlatLessonsAndCourses();
        return;
      }
      if (currentFolderId != null) {
        void fetchCatalog(null).then(res => {
          if (res.success !== false) {
            setRootFolders(
              ((res.items || []) as CatalogItem[]).filter(isCatalogFolder),
            );
          }
        });
      }
    },
    [loadCatalog, currentFolderId, loadFlatLessonsAndCourses],
  );

  const hasMyCourses = useMemo(() => {
    if (useCatalogMode) {
      return courses.some(
        c =>
          Number(c.user_id) !== TWO_EASY_USER_ID &&
          (c.folder_id == null || c.folder_id === undefined),
      );
    }
    return courses.some(c => Number(c.user_id) !== TWO_EASY_USER_ID);
  }, [courses, useCatalogMode]);

  const hasTwoEasyCourses = useMemo(
    () => courses.some(c => Number(c.user_id) === TWO_EASY_USER_ID),
    [courses],
  );

  useEffect(() => {
    if (tab === 'twoEasyCourses' && !hasTwoEasyCourses) {
      setTab(isAuthorized ? 'my' : 'twoEasy');
    }
  }, [tab, hasTwoEasyCourses, isAuthorized]);

  // Leaving "my" or losing catalog support resets folder navigation.
  useEffect(() => {
    if ((tab !== 'my' || !useCatalogMode) && currentFolderId != null) {
      setCurrentFolderId(null);
      setCurrentFolderMeta(null);
    }
  }, [tab, currentFolderId, useCatalogMode]);

  const isCoursesTab = tab === 'myCourses' || tab === 'twoEasyCourses';
  const isBoardsTab = tab === 'myBoards';
  const isMyCatalogTab = tab === 'my' && useCatalogMode;

  const visibleLessons = useMemo(() => {
    if (isCoursesTab || isBoardsTab || isMyCatalogTab) {
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
  }, [
    isAuthorized,
    lessons,
    tab,
    levelFilter,
    search,
    isCoursesTab,
    isBoardsTab,
    isMyCatalogTab,
  ]);

  const visibleCourses = useMemo(() => {
    if (!isCoursesTab || isBoardsTab) {
      return [] as Course[];
    }
    const list =
      tab === 'myCourses'
        ? courses.filter(c => {
            if (Number(c.user_id) === TWO_EASY_USER_ID) {
              return false;
            }
            // Only hide folder-nested courses when catalog folders are live.
            if (
              useCatalogMode &&
              c.folder_id != null &&
              c.folder_id !== undefined
            ) {
              return false;
            }
            return true;
          })
        : courses.filter(c => Number(c.user_id) === TWO_EASY_USER_ID);

    return list.filter(course => matchesCourseSearch(course, search));
  }, [courses, tab, search, isCoursesTab, isBoardsTab, useCatalogMode]);

  const visibleCatalogItems = useMemo(() => {
    if (!isMyCatalogTab) {
      return [] as CatalogItem[];
    }
    return catalogItems.filter(item => matchesCatalogSearch(item, search));
  }, [isMyCatalogTab, catalogItems, search]);

  return {
    lessons: visibleLessons,
    courses: visibleCourses,
    catalogItems: visibleCatalogItems,
    rawCatalogItems: catalogItems,
    setCatalogItems,
    rootFolders,
    currentFolderId,
    currentFolderMeta,
    enterFolder,
    leaveFolder,
    refreshCatalog,
    catalogSupported,
    useCatalogMode,
    isMyCatalogTab,
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
