export type SessionProfile = {
  name?: string;
  login?: string;
  email?: string;
  phone?: string;
  surname?: string;
  role_id?: number;
  isStudent?: boolean;
  studentId?: number;
  id?: number;
  user_id?: string | number;
  tag?: string;
  avatar?: string | null;
  token?: string;
};

export function isSessionAuthorized(profile?: SessionProfile | null): boolean {
  return !!(profile?.login || profile?.studentId || profile?.token);
}
