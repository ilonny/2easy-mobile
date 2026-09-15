import {getJson, postJson} from '../../../shared/api';
import type {Board, LessonBoardScopeResponse} from '../model/types';

export async function fetchBoards(options?: {
  studentId?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (options?.studentId) {
    qs.set('student_id', String(options.studentId));
  }
  if (options?.search?.trim()) {
    qs.set('search', options.search.trim());
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return getJson<{boards?: Board[]}>({
    path: `/boards${suffix}`,
    isSecure: true,
  });
}

export async function fetchBoard(boardId: number) {
  return getJson<{board?: Board}>({
    path: `/board?id=${boardId}`,
    isSecure: true,
  });
}

export async function createBoard(payload: {
  title: string;
  description?: string;
  tags?: string;
  image_id?: number;
}) {
  return postJson<{createdBoard?: Board}>({
    path: '/board/create',
    isSecure: true,
    data: payload,
  });
}

export async function editBoard(payload: {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  image_id?: number | string | null;
}) {
  return postJson<{updatedBoard?: Board}>({
    path: '/board/edit',
    isSecure: true,
    data: payload,
  });
}

export async function deleteBoard(id: number) {
  return postJson({
    path: '/board/delete',
    isSecure: true,
    data: {id},
  });
}

export async function createBoardRelation(payload: {
  board_id: number;
  student_id: number;
  status: 'open' | 'close';
}) {
  return postJson({
    path: '/board-relation/create',
    isSecure: true,
    data: payload,
  });
}

export async function deleteBoardRelation(relationId: number) {
  return postJson({
    path: '/board-relation/delete',
    isSecure: true,
    data: {relation_id: relationId},
  });
}

export async function fetchLessonBoardScope(
  lessonId: number,
  studentId?: number,
  sessionId?: number,
) {
  const qs = new URLSearchParams({lesson_id: String(lessonId)});
  if (studentId) {
    qs.set('student_id', String(studentId));
  }
  if (sessionId) {
    qs.set('session_id', String(sessionId));
  }
  return getJson<LessonBoardScopeResponse>({
    path: `/board/lesson/scope?${qs.toString()}`,
    isSecure: true,
  });
}

export async function fetchLessonBoard(
  lessonId: number,
  studentId?: number,
  sessionId?: number,
) {
  const qs = new URLSearchParams({lesson_id: String(lessonId)});
  if (studentId) {
    qs.set('student_id', String(studentId));
  }
  if (sessionId) {
    qs.set('session_id', String(sessionId));
  }
  return getJson<{board?: Board}>({
    path: `/board/lesson?${qs.toString()}`,
    isSecure: true,
  });
}
