import {getJson, postJson} from '../../../shared/api';
import type {Lesson, LessonRelationStatus} from '../../../entities/lesson';

export type Course = {
  id: number;
  title?: string;
  description?: string;
  user_id?: number;
  image_path?: string;
  tags?: string;
  canEdit?: boolean;
  lesson_ids?: string | number[];
  'lesson_relations.status'?: LessonRelationStatus;
  'lesson_relations.id'?: number;
};

export async function fetchCourses(options?: {
  isSecure?: boolean;
  studentId?: number;
}): Promise<Course[]> {
  const qs = new URLSearchParams();
  if (options?.studentId) {
    qs.set('student_id', String(options.studentId));
  }
  const query = qs.toString();
  const res = await getJson<{
    success?: boolean;
    courses?: Course[];
    message?: string;
  }>({
    path: query ? `/course/list?${query}` : '/course/list',
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

export async function saveCourse(payload: {
  id?: number;
  title: string;
  description?: string;
  tags?: string;
  image_id?: number;
  lesson_ids: number[];
}) {
  const {id, lesson_ids, ...rest} = payload;
  return postJson<{
    success?: boolean;
    message?: string;
    createdCourse?: {id?: number};
  }>({
    path: id ? '/course/edit' : '/course/create',
    isSecure: true,
    data: {
      ...rest,
      ...(id ? {id} : {}),
      lesson_ids: JSON.stringify(lesson_ids),
    },
  });
}
