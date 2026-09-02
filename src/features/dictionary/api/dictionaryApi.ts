import {deleteJson, getJson, patchJson, postJson} from '../../../shared/api';

export type DictionaryItem = {
  id: number;
  studentId: number;
  lessonId: number | null;
  lessonName: string | null;
  sourceWord: string;
  translatedWord: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  isLearned: boolean;
  isFavorite: boolean;
};

export type DictionaryListParams = {
  search?: string;
  isLearned?: boolean;
};

export type CreateWordPayload = {
  sourceWord: string;
  translatedWord: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
  lessonId?: number;
};

function buildQuery(params: DictionaryListParams = {}) {
  const qs = new URLSearchParams();
  if (params.search?.trim()) {
    qs.set('search', params.search.trim());
  }
  if (typeof params.isLearned === 'boolean') {
    qs.set('isLearned', params.isLearned ? 'true' : 'false');
  }
  const query = qs.toString();
  return query ? `?${query}` : '';
}

export async function fetchDictionary(
  studentId: number,
  params: DictionaryListParams = {},
): Promise<DictionaryItem[]> {
  if (!studentId) {
    return [];
  }
  const res = await getJson<DictionaryItem[] | {success?: boolean}>({
    path: `/dictionary/${studentId}${buildQuery(params)}`,
    isSecure: true,
  });
  return Array.isArray(res) ? res : [];
}

export async function createDictionaryWord(
  studentId: number,
  data: CreateWordPayload,
) {
  return postJson<DictionaryItem & {success?: boolean; message?: string}>({
    path: `/dictionary/${studentId}`,
    isSecure: true,
    data,
  });
}

export async function createWordsForLesson(
  lessonId: number,
  data: CreateWordPayload,
  studentIds?: number[],
) {
  return postJson<{
    success?: boolean;
    message?: string;
    createdCount?: number;
    skippedCount?: number;
  }>({
    path: `/lessons/${lessonId}/dictionary/words`,
    isSecure: true,
    data: {
      ...data,
      ...(studentIds?.length ? {studentIds} : {}),
    },
  });
}

export async function updateDictionaryLearned(
  studentId: number,
  ids: number[],
  isLearned: boolean,
) {
  return patchJson<{success?: boolean; message?: string}>({
    path: `/dictionary/${studentId}/learned`,
    isSecure: true,
    data: {ids, isLearned},
  });
}

export async function deleteDictionaryWords(studentId: number, ids: number[]) {
  return deleteJson<{success?: boolean; message?: string}>({
    path: `/dictionary/${studentId}`,
    isSecure: true,
    data: {ids},
  });
}

export async function translateWord(data: {
  text: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
}) {
  return postJson<{
    sourceWord?: string;
    translatedWord?: string;
    success?: boolean;
    message?: string;
  }>({
    path: '/translate',
    isSecure: true,
    data,
  });
}

export type DictionaryLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

export async function fetchDictionaryLanguages(): Promise<DictionaryLanguage[]> {
  const res = await getJson<DictionaryLanguage[] | {success?: boolean}>({
    path: '/languages?isActive=true',
    isSecure: true,
  });
  return Array.isArray(res) ? res : [];
}
