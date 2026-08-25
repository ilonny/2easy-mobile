import {getJson, postJson} from '../../../shared/api';
import type {
  AiLessonDraft,
  AiLimitsMap,
  AiLimitCategory,
} from '../lib/types';
import {AI_MONTHLY_LIMIT_CODE} from '../lib/types';

export type AiMetaResponse = {
  success?: boolean;
  levels?: string[];
  exerciseTypes?: Array<{type: string}>;
  model?: string;
  limits?: AiLimitsMap;
  message?: string;
  code?: string;
};

export type AiTopicSuggestion = {
  success?: boolean;
  topic?: string;
  title?: string;
  description?: string;
  tags?: string;
  assistantMessage?: string;
  aiLimit?: {category?: string; remaining?: number};
  message?: string;
  code?: string;
  limitExceeded?: boolean;
};

export type AiGenerateResponse = AiLessonDraft & {
  success?: boolean;
  aiLimit?: {category?: string; remaining?: number};
  message?: string;
  code?: string;
  limitExceeded?: boolean;
};

export type AiSaveResponse = {
  success?: boolean;
  id?: number;
  createdLesson?: {id?: number; dataValues?: {id?: number}};
  exercisesCount?: number;
  message?: string;
};

export async function fetchAiMeta() {
  return getJson<AiMetaResponse>({
    path: '/ai/meta',
    isSecure: true,
  });
}

export async function suggestAiTopic(data: {
  level: string;
  description?: string;
  exerciseTypes?: string[];
  rejectTopics?: string[];
  ui_language?: string;
}) {
  return postJson<AiTopicSuggestion>({
    path: '/ai/suggest-topic',
    isSecure: true,
    data,
  });
}

export async function generateAiLesson(data: {
  level: string;
  topic?: string;
  description?: string;
  extraWishes?: string;
  exerciseTypes: string[];
  conversation?: Array<{role: string; content: string}>;
  ui_language?: string;
}) {
  return postJson<AiGenerateResponse>({
    path: '/ai/generate-lesson',
    isSecure: true,
    data,
  });
}

export async function refineAiLesson(data: {
  instruction: string;
  current: AiLessonDraft;
  conversation?: Array<{role: string; content: string}>;
  lesson_id?: number;
  ui_language?: string;
}) {
  return postJson<AiGenerateResponse>({
    path: '/ai/refine-lesson',
    isSecure: true,
    data,
  });
}

export async function saveAiLesson(data: {
  draft: AiLessonDraft;
  course_id?: number;
  image_id?: number;
}) {
  return postJson<AiSaveResponse>({
    path: '/ai/save-lesson',
    isSecure: true,
    data,
  });
}

export function formatAiAvailableLimit(
  remaining: number | null | undefined,
  category: AiLimitCategory,
  t: (key: string) => string,
) {
  const purposeKey =
    category === 'suggest_topic'
      ? 'ai.limitPurposeTopic'
      : category === 'refine_exercise'
        ? 'ai.limitPurposeExercise'
        : 'ai.limitPurposeLesson';
  return t('ai.availableLimitRemaining')
    .replace('{{purpose}}', t(purposeKey))
    .replace('{{count}}', String(remaining ?? '—'));
}

export function isAiLimitExceeded(json: {
  code?: string;
  limitExceeded?: boolean;
}) {
  return (
    json?.code === AI_MONTHLY_LIMIT_CODE || json?.limitExceeded === true
  );
}

export function remainingFromAiResponse(
  json: {aiLimit?: {remaining?: number; category?: string}},
  category: AiLimitCategory,
): number | null {
  if (
    json?.aiLimit &&
    (json.aiLimit.category === category || !json.aiLimit.category)
  ) {
    return Number(json.aiLimit.remaining);
  }
  return null;
}
