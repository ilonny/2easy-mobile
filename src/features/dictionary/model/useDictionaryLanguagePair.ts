import {useCallback, useEffect, useState} from 'react';

import {
  fetchDictionaryLanguages,
  type DictionaryLanguage,
} from '../api/dictionaryApi';
import {
  DEFAULT_SOURCE_LANGUAGE_CODE,
  DEFAULT_TARGET_LANGUAGE_CODE,
  getStoredLanguagePair,
  resolveLanguageCode,
  setStoredLanguagePair,
  type LanguagePair,
} from '../lib/languagePairStorage';

export function useDictionaryLanguagePair(enabled: boolean) {
  const [languages, setLanguages] = useState<DictionaryLanguage[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [sourceLanguageCode, setSourceLanguageCode] = useState(
    DEFAULT_SOURCE_LANGUAGE_CODE,
  );
  const [targetLanguageCode, setTargetLanguageCode] = useState(
    DEFAULT_TARGET_LANGUAGE_CODE,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const stored = await getStoredLanguagePair();
      if (cancelled) {
        return;
      }
      setSourceLanguageCode(stored.sourceLanguageCode);
      setTargetLanguageCode(stored.targetLanguageCode);
      setLoadingLanguages(true);
      try {
        const list = await fetchDictionaryLanguages();
        if (cancelled) {
          return;
        }
        setLanguages(list);
        setSourceLanguageCode(prev =>
          resolveLanguageCode(prev, list, DEFAULT_SOURCE_LANGUAGE_CODE),
        );
        setTargetLanguageCode(prev =>
          resolveLanguageCode(prev, list, DEFAULT_TARGET_LANGUAGE_CODE),
        );
      } finally {
        if (!cancelled) {
          setLoadingLanguages(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const swapLanguages = useCallback(() => {
    setSourceLanguageCode(targetLanguageCode);
    setTargetLanguageCode(sourceLanguageCode);
  }, [sourceLanguageCode, targetLanguageCode]);

  const persistLanguagePair = useCallback(async () => {
    const pair: LanguagePair = {
      sourceLanguageCode:
        sourceLanguageCode || DEFAULT_SOURCE_LANGUAGE_CODE,
      targetLanguageCode:
        targetLanguageCode || DEFAULT_TARGET_LANGUAGE_CODE,
    };
    await setStoredLanguagePair(pair);
  }, [sourceLanguageCode, targetLanguageCode]);

  return {
    languages,
    loadingLanguages,
    sourceLanguageCode,
    targetLanguageCode,
    setSourceLanguageCode,
    setTargetLanguageCode,
    swapLanguages,
    persistLanguagePair,
  };
}
