export type Lesson = {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  image_path?: string;
  user_id: number;
  created_from_2easy?: number;
  is_free?: string | boolean;
  is_my_lesson?: boolean;
};

export const LEVEL_FILTERS = [
  'All lessons',
  'A2 - A2+',
  'B1 - B2+',
  'C1',
] as const;

export type LevelFilter = (typeof LEVEL_FILTERS)[number];

export type LessonsTab = 'twoEasy' | 'my';
