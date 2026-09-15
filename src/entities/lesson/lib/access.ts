import {TWO_EASY_USER_ID} from '../model/types';

export type TrialLockLesson = {
  is_free?: string | boolean | number | null;
  user_id?: number;
  created_from_2easy?: number | boolean | null;
} | null | undefined;

/** API may send boolean, 0/1, or string "true"/"1". */
export function isLessonMarkedFree(lesson: TrialLockLesson): boolean {
  const value = lesson?.is_free;
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'yes'
    );
  }
  return false;
}

export function isTwoEasyCatalogLesson(lesson: TrialLockLesson): boolean {
  return Boolean(
    lesson &&
      (Number(lesson.user_id) === TWO_EASY_USER_ID ||
        Boolean(lesson.created_from_2easy)),
  );
}

/**
 * Trial (`subscribe_type_id === 1`) cannot open paid 2easy catalog lessons.
 * Guests are not locked here — they get login/register (Try Now) instead.
 * Students are never locked by this rule.
 */
export function isLessonLockedOnFreeTariff(
  lesson: TrialLockLesson,
  isFreeTariff?: boolean,
  isStudent?: boolean,
) {
  return Boolean(
    !isStudent &&
      isFreeTariff &&
      lesson &&
      !isLessonMarkedFree(lesson) &&
      isTwoEasyCatalogLesson(lesson),
  );
}

/**
 * Site LessonCard: logged-in teacher without any subscription cannot open
 * lessons; trial additionally locks paid 2easy catalog items.
 */
export function isTeacherLessonAccessBlocked(
  lesson: TrialLockLesson,
  opts: {
    isStudent?: boolean;
    hasSubscription?: boolean;
    isFreeTariff?: boolean;
  },
) {
  if (opts.isStudent) {
    return false;
  }
  if (!opts.hasSubscription) {
    return true;
  }
  return isLessonLockedOnFreeTariff(
    lesson,
    opts.isFreeTariff,
    opts.isStudent,
  );
}

/** Free lessons first (site ProfileLessons sort on trial). */
export function sortLessonsFreeFirst<T extends TrialLockLesson>(
  lessons: T[],
): T[] {
  return [...lessons].sort((a, b) => {
    const aFree = isLessonMarkedFree(a);
    const bFree = isLessonMarkedFree(b);
    if (aFree === bFree) {
      return 0;
    }
    return aFree ? -1 : 1;
  });
}
