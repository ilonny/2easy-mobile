import {postJson} from '../../../shared/api';

export type HomeworkResolveResult = {
  success?: boolean;
  homework_lesson_id?: number;
  has_individual_homework?: boolean;
  message?: string;
};

export type HomeworkBatchResolveResult = {
  success?: boolean;
  by_lesson_id?: Record<
    string,
    {homework_lesson_id?: number; has_individual_homework?: boolean}
  >;
  message?: string;
};

export type HomeworkCheckResult = {
  success?: boolean;
  exists?: boolean;
  first_homework_id?: number;
  message?: string;
};

export type HomeworkCreateResult = {
  success?: boolean;
  first_homework_id?: number;
  homework_lesson_id?: number;
  message?: string;
};

export async function checkHomework(lessonId: number) {
  return postJson<HomeworkCheckResult>({
    path: '/lessons/homework/check',
    isSecure: true,
    data: {lesson_id: lessonId},
  });
}

export async function createCommonHomework(lessonId: number, exIds: number[]) {
  return postJson<HomeworkCreateResult>({
    path: '/lessons/homework/create',
    isSecure: true,
    data: {lesson_id: lessonId, ex_ids: exIds},
  });
}

export async function createIndividualHomework(
  lessonId: number,
  studentId: number,
  exIds: number[],
) {
  return postJson<HomeworkCreateResult>({
    path: '/lessons/homework/create-individual-for-student',
    isSecure: true,
    data: {
      lesson_id: lessonId,
      student_id: studentId,
      ex_ids: exIds,
    },
  });
}

export async function getOrCreateHomeworkForStudent(
  lessonId: number,
  studentId: number,
) {
  return postJson<HomeworkCreateResult>({
    path: '/lessons/homework/get-or-create-for-student',
    isSecure: true,
    data: {lesson_id: lessonId, student_id: studentId},
  });
}

export async function createMyHomework(lessonId: number, studentId?: number) {
  return postJson<HomeworkCreateResult>({
    path: '/lessons/homework/create-my',
    isSecure: true,
    data: {
      lesson_id: lessonId,
      ...(studentId ? {student_id: studentId} : {}),
    },
  });
}

export async function resolveHomeworkForStudent(
  lessonId: number,
  studentId: number,
) {
  return postJson<HomeworkResolveResult>({
    path: '/lessons/homework/resolve-for-student',
    isSecure: true,
    data: {lesson_id: lessonId, student_id: studentId},
  });
}

export async function resolveHomeworkForStudentBatch(
  lessonIds: number[],
  studentId: number,
) {
  return postJson<HomeworkBatchResolveResult>({
    path: '/lessons/homework/resolve-for-student',
    isSecure: true,
    data: {lesson_ids: lessonIds, student_id: studentId},
  });
}
