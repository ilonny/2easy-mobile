import {readStorage, writeStorage} from '../../../shared/lib/storage';

export const DICTIONARY_LANGUAGE_PAIR_STORAGE_KEY =
  'dictionary_last_language_pair';

export const DEFAULT_SOURCE_LANGUAGE_CODE = 'en';
export const DEFAULT_TARGET_LANGUAGE_CODE = 'ru';

export type LanguagePair = {
  sourceLanguageCode: string;
  targetLanguageCode: string;
};

export const DEFAULT_LANGUAGE_PAIR: LanguagePair = {
  sourceLanguageCode: DEFAULT_SOURCE_LANGUAGE_CODE,
  targetLanguageCode: DEFAULT_TARGET_LANGUAGE_CODE,
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

export async function getStoredLanguagePair(): Promise<LanguagePair> {
  try {
    const raw = await readStorage(DICTIONARY_LANGUAGE_PAIR_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LANGUAGE_PAIR;
    }
    const parsed = JSON.parse(raw) as Partial<LanguagePair>;
    return {
      sourceLanguageCode: isNonEmptyString(parsed.sourceLanguageCode)
        ? parsed.sourceLanguageCode.trim().toLowerCase()
        : DEFAULT_SOURCE_LANGUAGE_CODE,
      targetLanguageCode: isNonEmptyString(parsed.targetLanguageCode)
        ? parsed.targetLanguageCode.trim().toLowerCase()
        : DEFAULT_TARGET_LANGUAGE_CODE,
    };
  } catch {
    return DEFAULT_LANGUAGE_PAIR;
  }
}

export async function setStoredLanguagePair(pair: LanguagePair): Promise<void> {
  await writeStorage(
    DICTIONARY_LANGUAGE_PAIR_STORAGE_KEY,
    JSON.stringify({
      sourceLanguageCode: pair.sourceLanguageCode,
      targetLanguageCode: pair.targetLanguageCode,
    }),
  );
}

export function resolveLanguageCode(
  code: string,
  languages: {code: string}[],
  fallbackCode: string,
): string {
  if (languages.some(language => language.code === code)) {
    return code;
  }
  if (languages.some(language => language.code === fallbackCode)) {
    return fallbackCode;
  }
  return languages[0]?.code || fallbackCode;
}

export function languageLabel(language: {
  code: string;
  name?: string;
  nativeName?: string;
}): string {
  return language.nativeName || language.name || language.code;
}
