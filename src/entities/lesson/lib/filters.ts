import {API_BASE_URL} from '../../../shared/config';
import type {Lesson} from '../model/types';

export function getLessonImageUrl(path?: string): string {
  if (!path) {
    return '';
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
}

export function matchesLevelFilter(lesson: Lesson, filter: string): boolean {
  if (!filter || filter === 'All lessons') {
    return true;
  }

  const filterParts = filter
    .replace(/\s+/g, '')
    .replace(/\+/g, '')
    .split('-')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);

  const lessonParts = (lesson.tags || '')
    .replace(/[–-]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\+/g, '')
    .split('-')
    .join(',')
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);

  return lessonParts.some(tag => filterParts.includes(tag));
}

export function matchesSearch(lesson: Lesson, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    lesson.title?.toLowerCase().includes(q) ||
    lesson.description?.toLowerCase().includes(q) ||
    lesson.tags?.toLowerCase().includes(q) ||
    false
  );
}
