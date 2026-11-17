/**
 * Languages Yandex SpeechKit can synthesize. Keep in sync with the site
 * and backend TTS_VOICE_BY_LANGUAGE_CODE.
 */
const YANDEX_TTS_LANGUAGE_CODES = ['en', 'ru', 'de', 'he', 'kk', 'uz'] as const;

const DEFAULT_TTS_LANGUAGE_CODE = 'en';

export function normalizeTtsLanguageCode(languageCode?: string) {
  if (!languageCode?.trim()) {
    return DEFAULT_TTS_LANGUAGE_CODE;
  }
  return (
    languageCode.trim().toLowerCase().split(/[-_]/)[0] ||
    DEFAULT_TTS_LANGUAGE_CODE
  );
}

export function isYandexTtsLanguageSupported(languageCode?: string) {
  const normalized = normalizeTtsLanguageCode(languageCode);
  return (YANDEX_TTS_LANGUAGE_CODES as readonly string[]).includes(normalized);
}
