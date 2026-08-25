export const AI_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

export type AiLevel = (typeof AI_LEVELS)[number];

export type AiExerciseTypeOption = {
  type: string;
  titleKey: string;
};

export const AI_EXERCISE_TYPE_OPTIONS: AiExerciseTypeOption[] = [
  {type: 'text-default', titleKey: 'templates.text'},
  {type: 'text-2-col', titleKey: 'templates.text2Col'},
  {type: 'text-sticker', titleKey: 'templates.textSticker'},
  {type: 'text-checklist', titleKey: 'templates.textChecklist'},
  {type: 'note', titleKey: 'templates.note'},
  {type: 'FILL_GAPS_NEW', titleKey: 'templates.fillGapsNew'},
  {type: 'test', titleKey: 'templates.test'},
  {type: 'match-word-word', titleKey: 'templates.matchWordWord'},
  {type: 'match-word-column', titleKey: 'templates.matchWordColumn'},
  {type: 'free-input-form', titleKey: 'templates.freeInput'},
];

export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type AiGeneratedExercise = {
  id?: number;
  clientKey?: string;
  type: string;
  sortIndex: number;
  data: Record<string, unknown>;
};

export type AiGeneratedLesson = {
  title: string;
  description: string;
  tags: string;
};

export type AiLessonDraft = {
  assistantMessage: string;
  lesson: AiGeneratedLesson;
  exercises: AiGeneratedExercise[];
};

export type AiLimitCategory =
  | 'generate_lesson'
  | 'suggest_topic'
  | 'refine_exercise';

export type AiLimitStatus = {
  limit: number;
  used: number;
  remaining: number;
  yearMonth?: string;
};

export type AiLimitsMap = Partial<Record<AiLimitCategory, AiLimitStatus>>;

export const AI_MONTHLY_LIMIT_CODE = 'AI_MONTHLY_LIMIT_EXCEEDED';

export function getExercisePreviewTitle(
  ex: AiGeneratedExercise,
  typeLabel: string,
) {
  const data = ex.data || {};
  return (
    (data.title as string) ||
    (data.subtitle as string) ||
    (data.description as string) ||
    typeLabel
  );
}
