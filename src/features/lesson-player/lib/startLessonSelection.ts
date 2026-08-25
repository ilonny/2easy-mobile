import {readStorage, writeStorage} from '../../../shared/lib/storage';

/** Same key as the website localStorage. */
export const START_LESSON_SELECTED_IDS_KEY = 'start_lesson_selected_ids';

export async function saveStartLessonSelectedIds(ids: number[]): Promise<void> {
  const cleaned = ids.map(Number).filter(n => Number.isFinite(n) && n > 0);
  await writeStorage(START_LESSON_SELECTED_IDS_KEY, JSON.stringify(cleaned));
}

export async function readStartLessonSelectedIds(): Promise<number[]> {
  try {
    const raw = await readStorage(START_LESSON_SELECTED_IDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(Number).filter(n => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}
