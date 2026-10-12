import {startLessonSession} from '../../lesson-player/api/lessonApi';
import {saveStartLessonSelectedIds} from '../../lesson-player/lib/startLessonSelection';
import {
  createMyHomework,
  getOrCreateHomeworkForStudent,
  resolveHomeworkForStudent,
} from '../api/homeworkApi';
import {positiveId} from './exDisplay';

export type HomeworkLessonFields = {
  id: number;
  homework_lesson_id?: number | string | null;
  has_individual_homework?: boolean | number | string | null;
  lesson_id_homework?: number | string | null;
  user_id?: number | string | null;
};

export function lessonHasHomeworkLink(lesson: HomeworkLessonFields): boolean {
  if (positiveId(lesson.homework_lesson_id)) {
    return true;
  }
  return !!lesson.has_individual_homework;
}

export function isHomeworkLesson(lesson: HomeworkLessonFields): boolean {
  return !!positiveId(lesson.lesson_id_homework);
}

/** Teacher opens existing individual HW or get-or-creates one. */
export async function openTeacherStudentHomework(options: {
  lessonId: number;
  studentId: number;
  knownHomeworkId?: number;
}): Promise<number | null> {
  const {lessonId, studentId, knownHomeworkId} = options;

  const resolved = await resolveHomeworkForStudent(lessonId, studentId);
  const resolvedId = positiveId(resolved?.homework_lesson_id);
  if (resolved?.has_individual_homework && resolvedId) {
    await saveStartLessonSelectedIds([studentId]);
    return resolvedId;
  }
  if (knownHomeworkId) {
    await saveStartLessonSelectedIds([studentId]);
    return knownHomeworkId;
  }

  const created = await getOrCreateHomeworkForStudent(lessonId, studentId);
  const createdId = positiveId(created?.homework_lesson_id);
  if (createdId) {
    await saveStartLessonSelectedIds([studentId]);
    return createdId;
  }
  return null;
}

/** Session for this student, so the viewer does not reuse another student's homework session. */
export async function startHomeworkSessionForStudent(
  homeworkLessonId: number,
  studentId: number,
): Promise<number | undefined> {
  if (!homeworkLessonId || !studentId) {
    return undefined;
  }
  await saveStartLessonSelectedIds([studentId]);
  try {
    const response = await startLessonSession(homeworkLessonId, [studentId]);
    return positiveId(response?.session?.id);
  } catch {
    return undefined;
  }
}

/** Student opens individual HW or create-my. */
export async function openStudentHomework(options: {
  lesson: HomeworkLessonFields;
  studentId?: number;
}): Promise<number | null> {
  const {lesson, studentId} = options;
  if (lesson.has_individual_homework && positiveId(lesson.homework_lesson_id)) {
    const id = positiveId(lesson.homework_lesson_id)!;
    if (studentId) {
      await saveStartLessonSelectedIds([studentId]);
    }
    return id;
  }

  const created = await createMyHomework(lesson.id, studentId);
  const createdId = positiveId(created?.homework_lesson_id);
  if (createdId) {
    if (studentId) {
      await saveStartLessonSelectedIds([studentId]);
    }
    return createdId;
  }

  const fallback = positiveId(lesson.homework_lesson_id);
  if (fallback) {
    if (studentId) {
      await saveStartLessonSelectedIds([studentId]);
    }
    return fallback;
  }
  return null;
}
