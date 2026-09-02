import {getExerciseTypeLabel} from '../../lesson-editor/model/templates';

export type HomeworkExRow = {
  id: number;
  type: string;
  data?: string | Record<string, unknown>;
  sortIndex?: number;
};

export function getExDisplayInfo(
  ex: HomeworkExRow,
  t: (key: string) => string,
): {typeLabel: string; title: string; description: string} {
  const typeLabel = getExerciseTypeLabel(ex.type, t);
  let title = '';
  let description = '';
  try {
    const parsed =
      typeof ex.data === 'string' ? JSON.parse(ex.data || '{}') : ex.data || {};
    title = String(
      (parsed as {title?: string; subtitle?: string}).title ||
        (parsed as {subtitle?: string}).subtitle ||
        '',
    );
    description = String(
      (parsed as {description?: string}).description || '',
    );
  } catch {
    /* ignore */
  }
  return {typeLabel, title, description};
}

export function positiveId(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return n;
}
