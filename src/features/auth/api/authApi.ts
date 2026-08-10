import {postJson} from '../../../shared/api';
import type {SessionProfile} from '../../../entities/session';

export type LoginRole = 'teacher' | 'student';

export type LoginPayload = {
  login: string;
  password: string;
  role?: LoginRole;
};

export type LoginResponse = SessionProfile & {
  token?: string;
  message?: string;
};

export async function loginRequest(payload: LoginPayload) {
  return postJson<LoginResponse>({
    path: '/login',
    data: payload,
  });
}

export async function registerRequest(payload: {
  login: string;
  name: string;
  phone?: string;
  privacy: boolean;
  ads_agreement: boolean;
}) {
  return postJson<{ok?: boolean; message?: string}>({
    path: '/register',
    data: payload,
  });
}

export async function resetPasswordRequest(login: string) {
  return postJson<{success?: boolean; message?: string}>({
    path: '/reset-password',
    data: {login},
  });
}

export async function studentForgotPasswordRequest(email: string) {
  return postJson<{success?: boolean; message?: string; code?: string}>({
    path: '/student-forgot-password',
    data: {email},
  });
}
