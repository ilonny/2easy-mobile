export type LessonRelationStatus = 'open' | 'close' | 'complete';

export type Lesson = {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  image_path?: string;
  user_id: number;
  created_from_id?: number | string | null;
  created_from_2easy?: number;
  is_free?: string | boolean;
  is_my_lesson?: boolean;
  /** Parent lesson id when this lesson is homework. */
  lesson_id_homework?: number | string | null;
  /** Resolved homework lesson id for current viewer/student. */
  homework_lesson_id?: number | string | null;
  has_individual_homework?: boolean | number | string | null;
  'lesson_relations.status'?: LessonRelationStatus;
  'lesson_relations.id'?: number;
};

export const LEVEL_FILTERS = [
  'All lessons',
  'A2 - A2+',
  'B1 - B2+',
  'C1',
] as const;

export type LevelFilter = (typeof LEVEL_FILTERS)[number];

export type LessonsTab =
  | 'twoEasy'
  | 'my'
  | 'myCourses'
  | 'twoEasyCourses'
  | 'myBoards';


export const TWO_EASY_USER_ID = 1;
