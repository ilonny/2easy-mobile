import {getJson, postJson} from '../../../shared/api';

export type Student = {
  id: number;
  name: string;
  email?: string;
  tag?: string;
  user_id?: number | string;
};

export type StudentInfo = Student & {
  success?: boolean;
  message?: string;
};

export async function fetchStudents(): Promise<Student[]> {
  const res = await getJson<Student[] | {message?: string}>({
    path: '/student',
    isSecure: true,
  });
  return Array.isArray(res) ? res : [];
}

export async function fetchStudentInfo(id: number): Promise<StudentInfo | null> {
  const res = await getJson<StudentInfo>({
    path: `/student-info?id=${id}`,
    isSecure: true,
  });
  if (!res || res.success === false || !res.id) {
    return null;
  }
  return res;
}

export async function createStudent(data: {
  name: string;
  email: string;
  tag?: string;
}) {
  return postJson<{success?: boolean; message?: string} & Partial<Student>>({
    path: '/student/create',
    isSecure: true,
    data: {
      ...data,
      email: data.email.trim(),
    },
  });
}

export async function updateStudent(data: {
  id: number;
  name: string;
  email: string;
  tag?: string;
}) {
  return postJson<{success?: boolean; message?: string} & Partial<Student>>({
    path: '/student/edit',
    isSecure: true,
    data: {
      ...data,
      email: data.email.trim(),
    },
  });
}

export async function deleteStudent(id: number) {
  return postJson<{success?: boolean; message?: string}>({
    path: '/student/delete',
    isSecure: true,
    data: {id},
  });
}

export async function createLessonRelation(data: {
  lesson_id: number;
  student_id: number;
  status: 'open' | 'close';
}) {
  return postJson<{success?: boolean; message?: string}>({
    path: '/lesson-relation/create',
    isSecure: true,
    data,
  });
}

export type LessonParticipant = {
  id?: number;
  student_id: number;
  'student.name'?: string;
  'student.email'?: string;
  name?: string;
  email?: string;
};

export async function fetchLessonStudents(
  lessonId: number,
  studentIds?: number[],
): Promise<LessonParticipant[]> {
  const qs = new URLSearchParams({lesson_id: String(lessonId)});
  if (studentIds?.length) {
    qs.set('student_ids', studentIds.join(','));
  }
  const res = await getJson<{
    success?: boolean;
    studentList?: LessonParticipant[];
  }>({
    path: `/lesson-students?${qs.toString()}`,
    isSecure: true,
  });
  return Array.isArray(res?.studentList) ? res.studentList : [];
}
