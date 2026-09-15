import {getJson, postJson, postMultipart} from '../../../shared/api';
import {mapExerciseRow, isExVisible} from '../lib/exMappers';
import type {Exercise, LessonDetail} from '../model/types';

export type LessonSession = {
  id: number;
  lesson_id: number;
  teacher_user_id: number;
  student_ids: number[];
  is_group: boolean;
};

export async function startLessonSession(
  lessonId: number,
  studentIds: number[],
) {
  return postJson<{success?: boolean; session?: LessonSession; message?: string}>({
    path: '/lesson/session/start',
    isSecure: true,
    data: {lesson_id: lessonId, student_ids: studentIds},
  });
}

export async function resolveLessonSession(
  lessonId: number,
  sessionId?: number,
) {
  const qs = new URLSearchParams({lesson_id: String(lessonId)});
  if (sessionId) {
    qs.set('session_id', String(sessionId));
  }
  return getJson<{success?: boolean; session?: LessonSession; message?: string}>({
    path: `/lesson/session/resolve?${qs.toString()}`,
    isSecure: true,
  });
}

export async function fetchLesson(lessonId: number, studentId?: number) {
  const qs = new URLSearchParams({id: String(lessonId)});
  if (studentId) {
    qs.set('student_id', String(studentId));
  }
  return getJson<{lesson?: LessonDetail}>({
    path: `/lesson?${qs.toString()}`,
    isSecure: true,
  });
}

export async function fetchExList(
  lessonId: number,
  options?: {hash?: string; filterHidden?: boolean},
): Promise<Exercise[]> {
  const qs = new URLSearchParams({lesson_id: String(lessonId)});
  if (options?.hash) {
    qs.set('hash', options.hash);
  }
  const list = await getJson<unknown>({
    path: `/ex/list?${qs.toString()}`,
    isSecure: true,
  });
  if (!Array.isArray(list)) {
    return [];
  }
  let mapped = list.map(row => mapExerciseRow(row as never));
  mapped = mapped.sort((a, b) => a.sortIndex - b.sortIndex);
  if (options?.filterHidden) {
    mapped = mapped.filter(ex => isExVisible(ex.is_visible));
  }
  return mapped;
}

export async function saveExercise(payload: {
  lesson_id: number;
  id?: number;
  type: string;
  data: string;
  sortIndex?: number;
  currentSortIndexToShift?: number;
}) {
  return postJson({
    path: '/ex/create',
    isSecure: true,
    data: payload,
  });
}

export async function deleteExercise(id: number) {
  return postJson({
    path: '/ex/delete',
    isSecure: true,
    data: {id},
  });
}

export async function changeExSortIndex(id: number, sortIndex: number) {
  return postJson({
    path: '/ex/change-sort-index',
    isSecure: true,
    data: {id, sortIndex},
  });
}

export async function changeExVisible(id: number, is_visible: boolean) {
  return postJson({
    path: '/ex/change-visible',
    isSecure: true,
    data: {id, is_visible},
  });
}

export async function copyExercise(payload: {
  lesson_id: number;
  /** Source exercise id (server copy path). */
  id?: number;
  type?: string;
  data?: string;
  sortIndex?: number;
  currentSortIndexToShift?: number;
}) {
  return postJson({
    path: '/ex/copy',
    isSecure: true,
    data: payload,
  });
}

export async function editLesson(payload: Record<string, unknown>) {
  return postJson({
    path: '/lesson/edit-lesson',
    isSecure: true,
    data: payload,
  });
}

export async function createLesson(payload: Record<string, unknown>) {
  return postJson({
    path: '/lesson/create-lesson',
    isSecure: true,
    data: payload,
  });
}

export async function copyLesson(lessonId: number) {
  return postJson<{success?: boolean; id?: number; successMessage?: string}>({
    path: '/lessons/copy',
    isSecure: true,
    data: {lesson_id: lessonId},
  });
}

export async function deleteLesson(lessonId: number) {
  return postJson<{success?: boolean; message?: string}>({
    path: '/lesson/delete-lesson',
    isSecure: true,
    data: {id: lessonId},
  });
}

export async function addLessonToCourse(payload: {
  lesson_id: number;
  courses_ids: number[];
}) {
  return postJson<{success?: boolean; message?: string}>({
    path: '/course/add-lesson',
    isSecure: true,
    data: {
      lesson_id: payload.lesson_id,
      courses_ids: JSON.stringify(payload.courses_ids),
    },
  });
}

export async function fetchAnswers(
  lessonId: number,
  exId: number,
  studentId?: number,
) {
  if (
    !Number.isFinite(lessonId) ||
    lessonId <= 0 ||
    !Number.isFinite(exId) ||
    exId <= 0 ||
    !studentId ||
    !Number.isFinite(studentId) ||
    studentId <= 0
  ) {
    // Backend always filters by student_id; missing/NaN ids crash MySQL.
    return [];
  }
  const path = `/answer?lesson_id=${lessonId}&ex_id=${exId}&student_id=${studentId}`;
  const data = await getJson<unknown>({path, isSecure: true});
  return Array.isArray(data) ? data : [];
}

export async function writeAnswerApi(payload: {
  lesson_id: number;
  ex_id: number;
  q_id: number | string;
  answer: string;
  student_id: number;
}) {
  const {lesson_id, ex_id, student_id} = payload;
  if (
    !Number.isFinite(lesson_id) ||
    lesson_id <= 0 ||
    !Number.isFinite(ex_id) ||
    ex_id <= 0 ||
    !Number.isFinite(student_id) ||
    student_id <= 0
  ) {
    return;
  }
  return postJson({
    path: '/answer',
    isSecure: true,
    data: payload,
  });
}

export async function resetAnswers(payload: {
  lesson_id: number;
  ex_id: number;
  student_id: number;
}) {
  const {lesson_id, ex_id, student_id} = payload;
  if (
    !Number.isFinite(lesson_id) ||
    lesson_id <= 0 ||
    !Number.isFinite(ex_id) ||
    ex_id <= 0 ||
    !Number.isFinite(student_id) ||
    student_id <= 0
  ) {
    return;
  }
  return postJson({
    path: '/answer/reset',
    isSecure: true,
    data: payload,
  });
}

export async function uploadPhotos(uris: Array<{uri: string; name?: string; type?: string}>) {
  const fd = new FormData();
  uris.forEach((file, index) => {
    fd.append('image', {
      uri: file.uri,
      name: file.name || `image-${index}.jpg`,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
  });
  return postMultipart<{attachments?: Array<{id?: number; path?: string}>}>({
    path: '/upload-photos',
    formData: fd,
    isSecure: true,
  });
}

export async function uploadPhotosByUrl(images: Array<{dataURL?: string}>) {
  return postJson<{attachments?: Array<{id?: number; path?: string}>}>({
    path: '/upload-photos-by-url',
    isSecure: true,
    data: images as unknown as Record<string, unknown>,
  });
}

export async function searchImages(query: string) {
  return postJson<{images?: string[]}>({
    path: '/search-images/search',
    isSecure: true,
    data: {query},
  });
}
