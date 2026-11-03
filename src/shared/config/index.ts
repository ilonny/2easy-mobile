export {
  ensureApiBase,
  getApiBaseUrl,
  getApiUrl,
  getJitsiDomain,
  getWebUrl,
  rewriteSiteUrl,
} from './apiBase';

export const STORAGE_KEYS = {
  token: 'token',
  profile: 'profile',
  registrationCompleted: 'success_registration_completed',
} as const;

