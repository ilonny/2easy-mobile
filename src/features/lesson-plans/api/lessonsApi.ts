import {getJson} from '../../../shared/api';
import type {Lesson} from '../../../entities/lesson';

type LessonsResponse = {
  lessons?: Lesson[];
};

export async function fetchMainPageLessons() {
  return getJson<LessonsResponse>({
    path: '/main-page-lessons',
  });
}

export async function fetchPublicLessons() {
  return getJson<LessonsResponse>({
    path: '/main-page-lessons?disable_limit=1',
  });
}

export async function fetchSecureLessons(studentId?: number) {
  const params = new URLSearchParams();
  if (studentId) {
    params.set('student_id', String(studentId));
    params.set('include_course_lessons', '1');
  }
  const qs = params.toString();
  return getJson<LessonsResponse>({
    path: qs ? `/lessons?${qs}` : '/lessons',
    isSecure: true,
  });
}
