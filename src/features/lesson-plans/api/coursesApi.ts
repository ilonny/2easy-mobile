import {getJson} from '../../../shared/api';
import type {Lesson} from '../../../entities/lesson';

export type Course = {
  id: number;
  title?: string;
  description?: string;
  user_id?: number;
  image_path?: string;
  tags?: string;
  canEdit?: boolean;
  lesson_ids?: string | number[];
};

export async function fetchCourses(options?: {
  isSecure?: boolean;
}): Promise<Course[]> {
  const res = await getJson<{
    success?: boolean;
    courses?: Course[];
    message?: string;
  }>({
    path: '/course/list',
    isSecure: options?.isSecure ?? true,
  });
  if (res.success === false) {
    return [];
  }
  if (Array.isArray(res.courses)) {
    return res.courses;
  }
  return [];
}

export async function fetchCourseLessons(
  courseId: number,
  studentId?: number,
): Promise<Lesson[]> {
  const qs = new URLSearchParams({course_id: String(courseId)});
  if (studentId) {
    qs.set('student_id', String(studentId));
  }
  const res = await getJson<{
    success?: boolean;
    lessons?: Lesson[];
    message?: string;
  }>({
    path: `/lessons/course?${qs.toString()}`,
    isSecure: true,
  });
  if (res.success === false || !Array.isArray(res.lessons)) {
    return [];
  }
  return res.lessons;
}
