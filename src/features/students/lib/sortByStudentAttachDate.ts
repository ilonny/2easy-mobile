/**
 * Student cabinet order: newest attachment first.
 * Same proxy as the site/backend — `lesson_relations.id` (auto-increment;
 * there is no created_at on the relation).
 */
export function sortByStudentAttachDateDesc<
  T extends {id?: number; 'lesson_relations.id'?: number},
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aRel = Number(a['lesson_relations.id']) || 0;
    const bRel = Number(b['lesson_relations.id']) || 0;
    if (aRel !== bRel) {
      return bRel - aRel;
    }
    return Number(b.id) - Number(a.id);
  });
}
