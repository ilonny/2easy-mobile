import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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

function normalizeLanguage(value?: string | null): AppLanguage {
  const raw = (value || 'ru').toLowerCase();
  return raw.startsWith('en') ? 'en' : 'ru';
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
  const [language, setLanguageState] = useState<AppLanguage>('ru');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await readStorage(LANG_STORAGE_KEY);
      if (mounted) {
        setLanguageState(normalizeLanguage(stored));
        setReady(true);
      }
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
export function t(path: string, language: AppLanguage = 'ru'): string {
  return translate(dictionaries[language], path);
}
