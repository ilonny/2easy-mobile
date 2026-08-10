import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {STORAGE_KEYS} from '../../../shared/config';
import {
  clearAuthStorage,
  readStorage,
  writeStorage,
} from '../../../shared/lib/storage';
import {
  isSessionAuthorized,
  type SessionProfile,
} from './types';

type AuthContextValue = {
  profile: SessionProfile | null;
  isAuthorized: boolean;
  authIsLoading: boolean;
  setSession: (profile: SessionProfile) => Promise<void>;
  clearSession: () => Promise<void>;
  markRegistrationCompleted: () => Promise<void>;
  hasCompletedRegistration: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: PropsWithChildren) {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [hasCompletedRegistration, setHasCompletedRegistration] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [rawProfile, registrationFlag] = await Promise.all([
          readStorage(STORAGE_KEYS.profile),
          readStorage(STORAGE_KEYS.registrationCompleted),
        ]);

        if (!mounted) {
          return;
        }

        if (rawProfile) {
          setProfile(JSON.parse(rawProfile) as SessionProfile);
        }
        setHasCompletedRegistration(registrationFlag === '1');
      } finally {
        if (mounted) {
          setAuthIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setSession = useCallback(async (next: SessionProfile) => {
    if (next.token) {
      await writeStorage(STORAGE_KEYS.token, next.token);
    }
    await writeStorage(STORAGE_KEYS.profile, JSON.stringify(next));
    setProfile(next);
  }, []);

  const clearSession = useCallback(async () => {
    await clearAuthStorage([STORAGE_KEYS.token, STORAGE_KEYS.profile]);
    setProfile(null);
  }, []);

  const markRegistrationCompleted = useCallback(async () => {
    await writeStorage(STORAGE_KEYS.registrationCompleted, '1');
    setHasCompletedRegistration(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthorized: isSessionAuthorized(profile),
      authIsLoading,
      setSession,
      clearSession,
      markRegistrationCompleted,
      hasCompletedRegistration,
    }),
    [
      profile,
      authIsLoading,
      setSession,
      clearSession,
      markRegistrationCompleted,
      hasCompletedRegistration,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
