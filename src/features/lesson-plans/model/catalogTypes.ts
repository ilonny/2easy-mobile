import type {Lesson} from '../../../entities/lesson';
import type {Course} from '../api/coursesApi';

export type CatalogItemType = 'folder' | 'lesson' | 'course';

export type CatalogFolder = {
  id: number;
  type: 'folder';
  title: string;
  description?: string;
  tags?: string;
  image_id?: string;
  image_path?: string;
  user_id: number;
  school_id?: number | null;
  sort_index?: number;
  canEdit?: boolean;
  folder_id?: null;
};

export type CatalogLesson = Lesson & {
  type: 'lesson';
  sort_index?: number;
  folder_id?: number | null;
  canEdit?: boolean;
};

export type CatalogCourse = Course & {
  type: 'course';
  sort_index?: number;
  folder_id?: number | null;
  canEdit?: boolean;
};

export type CatalogItem = CatalogFolder | CatalogLesson | CatalogCourse;

export function isCatalogFolder(item: CatalogItem): item is CatalogFolder {
  return item.type === 'folder';
}

export function isCatalogLesson(item: CatalogItem): item is CatalogLesson {
  return item.type === 'lesson';
}

export function isCatalogCourse(item: CatalogItem): item is CatalogCourse {
  return item.type === 'course';
}
