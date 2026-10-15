import {useEffect, useState} from 'react';

import {
  getLessonCoverSource,
  isLessonLockedOnFreeTariff,
  type Lesson,
} from '../../../entities/lesson';
import {useAuth} from '../../../entities/session';
import {getJson} from '../../../shared/api';
import {discussionCardsCatalog} from '../../catalog/model/cardsData';
import {fetchCourses, type Course} from '../../lesson-plans/api/coursesApi';
import {fetchPublicLessons} from '../../lesson-plans/api/lessonsApi';
import {useSubscription} from './useSubscription';
import {
  CARDS_LIMIT,
  CARDS_LIMIT_WITH_TRY,
  discussionLandingMeta,
  GRAMMAR_COURSE_ID,
  speakingLandingCards,
  type ContentTab,
  type LandingCard,
} from './landingData';
import type {LandingTagTone} from '../ui/landing/landingTheme';

export type LandingAccess =
  | 'loading'
  | 'guest'
  | 'noSubscription'
  | 'subscribed'
  | 'student';

const normalizeLevel = (tag: string) =>
  tag
    .replace(/[АВС]/g, letter => ({А: 'A', В: 'B', С: 'C'}[letter] ?? letter))
    .replace(/\s+/g, '')
    .replace(/[–—]+|-{2,}/g, '-')
    .toUpperCase();

const LEVEL_PATTERN = /^[ABC][12]\+?(-[ABC]?[12]\+?)?$/;

const parseTags = (tags?: string | null) => {
  const list = (tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  const level = list.map(normalizeLevel).find(tag => LEVEL_PATTERN.test(tag));
  const topic = list.find(
    tag => tag !== '18+' && !LEVEL_PATTERN.test(normalizeLevel(tag)),
  );
  return {level, topic};
};

const levelTone = (level: string): LandingTagTone =>
  level.startsWith('A') ? 'green' : level.startsWith('B') ? 'mint' : 'blue';

function parseLessonIds(raw?: string | number[]): number {
  if (Array.isArray(raw)) {
    return raw.length;
  }
  if (!raw) {
    return 0;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function isDeletedFlag(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

export function useLandingAccess(): LandingAccess {
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription, loading} = useSubscription();
  if (!isAuthorized) {
    return 'guest';
  }
  if (profile?.isStudent) {
    return 'student';
  }
  if (loading) {
    return 'loading';
  }
  return hasSubscription ? 'subscribed' : 'noSubscription';
}

export function useLandingTabCards(tab: ContentTab) {
  const access = useLandingAccess();
  const {subscription} = useSubscription();
  const isFreeTariff = subscription?.subscribe_type_id === 1;
  const [cards, setCards] = useState<LandingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const limit =
    access === 'guest' || access === 'noSubscription'
      ? CARDS_LIMIT_WITH_TRY
      : CARDS_LIMIT;

  useEffect(() => {
    let mounted = true;

    if (tab === 'speaking') {
      setCards(speakingLandingCards);
      setLoading(false);
      setError(false);
      return () => {
        mounted = false;
      };
    }

    if (tab === 'discussion') {
      setCards(
        discussionCardsCatalog.map(item => {
          const key = item.titleKey.replace(/\.title$/, '');
          const meta = discussionLandingMeta[key];
          return {
            id: String(item.id),
            titleKey: item.titleKey,
            descriptionKey: item.descriptionKey,
            image: meta?.image ?? item.image,
            count: meta?.count,
            countKey: 'landing.content.cardsCount',
            level: meta?.level,
            levelTone: 'green' as const,
            slug: meta?.slug ?? item.slug,
          };
        }),
      );
      setLoading(false);
      setError(false);
      return () => {
        mounted = false;
      };
    }

    // Match site: wait until auth/subscription access is known for secured tabs.
    if (
      (tab === 'courses' || tab === 'grammar') &&
      access === 'loading'
    ) {
      setLoading(true);
      setError(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(false);
    // Drop previous tab cards so the carousel remounts from offset 0 with a loader
    // instead of keeping a stale horizontal scroll position over empty space.
    setCards([]);

    (async () => {
      try {
        if (tab === 'lessons') {
          const res = await fetchPublicLessons();
          if (!mounted) {
            return;
          }
          if (res.success === false) {
            setCards([]);
            setError(true);
            return;
          }
          const lessons = Array.isArray(res.lessons) ? res.lessons : [];
          setCards(lessons.slice(0, limit).map(toLessonCard));
          setError(false);
          return;
        }

        if (tab === 'courses') {
          const courses = await fetchCourses({isSecure: true});
          if (!mounted) {
            return;
          }
          setCards(
            courses
              .filter(
                course =>
                  Number(course.user_id) === 1 &&
                  !isDeletedFlag(
                    (course as Course & {is_deleted?: unknown}).is_deleted,
                  ),
              )
              .slice(0, limit)
              .map(toCourseCard),
          );
          setError(false);
          return;
        }

        if (tab === 'grammar') {
          const isTeacher =
            access === 'subscribed' || access === 'noSubscription';
          const path = isTeacher
            ? '/lessons/grammar'
            : `/lessons/course?course_id=${GRAMMAR_COURSE_ID}`;
          const res = await getJson<{lessons?: Lesson[]; success?: boolean}>({
            path,
            isSecure: true,
          });
          if (!mounted) {
            return;
          }
          if (res.success === false) {
            setCards([]);
            setError(true);
            return;
          }
          const lessons = Array.isArray(res.lessons) ? res.lessons : [];
          setCards(lessons.slice(0, limit).map(toLessonCard));
          setError(false);
        }
      } catch {
        if (mounted) {
          setCards([]);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tab, access, limit, isFreeTariff]);

  function toLessonCard(lesson: Lesson): LandingCard {
    const {level, topic} = parseTags(lesson.tags);
    const locked =
      access === 'subscribed' &&
      isLessonLockedOnFreeTariff(lesson, isFreeTariff);
    return {
      id: `lesson-${lesson.id}`,
      title: lesson.title?.trim() ?? '',
      description: lesson.description?.trim() || undefined,
      image: getLessonCoverSource(lesson.image_path),
      level,
      levelTone: level ? levelTone(level) : undefined,
      topic,
      lessonId: lesson.id,
      locked,
    };
  }

  function toCourseCard(course: Course): LandingCard {
    const level =
      parseTags(course.title).level ?? parseTags(course.tags).level;
    const lessonsCount = parseLessonIds(course.lesson_ids);
    return {
      id: `course-${course.id}`,
      title: course.title?.trim() ?? '',
      description: course.description?.trim() || undefined,
      image: getLessonCoverSource(course.image_path),
      count: lessonsCount || undefined,
      countKey: lessonsCount ? 'landing.content.lessonsCount' : undefined,
      level,
      levelTone: level ? levelTone(level) : undefined,
      courseId: course.id,
    };
  }

  return {cards, loading, error, access};
}
