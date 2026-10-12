import type {DictionaryItem} from '../api/dictionaryApi';

export type DictionaryLessonGroup = {
  key: string;
  label: string;
  lessonId: number | null;
  items: DictionaryItem[];
};

export function groupByLesson(
  items: DictionaryItem[],
  noLessonLabel: string,
): DictionaryLessonGroup[] {
  const groups = new Map<string, DictionaryLessonGroup>();

  for (const item of items) {
    const key =
      item.lessonId != null ? `lesson:${item.lessonId}` : 'lesson:none';
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      lessonId: item.lessonId,
      label: item.lessonName?.trim() || noLessonLabel,
      items: [item],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.lessonId == null && b.lessonId != null) {
      return 1;
    }
    if (a.lessonId != null && b.lessonId == null) {
      return -1;
    }
    return a.label.localeCompare(b.label, undefined, {sensitivity: 'base'});
  });
}
