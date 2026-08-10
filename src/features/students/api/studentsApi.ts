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
