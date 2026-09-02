import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {NativeModules, Platform} from 'react-native';

import {readStorage, writeStorage} from '../lib/storage';
import {en} from './locales/en';
import {ru, type TranslationTree} from './locales/ru';

export type AppLanguage = 'ru' | 'en';

const LANG_STORAGE_KEY = 'i18nextLng';

const dictionaries: Record<AppLanguage, TranslationTree> = {
  ru,
  en,
};

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (path: string) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getSystemLanguageTag(): string {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const apple =
        settings?.AppleLocale ||
        (Array.isArray(settings?.AppleLanguages)
          ? settings.AppleLanguages[0]
          : undefined);
      if (apple) {
        return String(apple);
      }
    }
    const android = NativeModules.I18nManager?.localeIdentifier;
    if (android) {
      return String(android);
    }
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

/** Russian device → ru, otherwise English. */
export function languageFromSystem(): AppLanguage {
  const tag = getSystemLanguageTag().toLowerCase().replace('_', '-');
  return tag.startsWith('ru') ? 'ru' : 'en';
}

function normalizeStoredLanguage(value?: string | null): AppLanguage | null {
  if (!value) {
    return null;
  }
  const raw = value.toLowerCase().replace('_', '-');
  if (raw.startsWith('en')) {
    return 'en';
  }
  if (raw.startsWith('ru')) {
    return 'ru';
  }
  return null;
}

function translate(tree: TranslationTree, path: string): string {
  const parts = path.split('.');
  let current: unknown = tree;
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

export function I18nProvider({children}: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(languageFromSystem);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await readStorage(LANG_STORAGE_KEY);
      if (!mounted) {
        return;
      }
      setLanguageState(normalizeStoredLanguage(stored) ?? languageFromSystem());
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang);
    await writeStorage(LANG_STORAGE_KEY, lang);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      ready,
      t: (path: string) => translate(dictionaries[language], path),
    }),
    [language, setLanguage, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

/** Static fallback for non-React helpers; prefer useI18n().t in UI. */
export function t(
  path: string,
  language: AppLanguage = languageFromSystem(),
): string {
  return translate(dictionaries[language], path);
}
