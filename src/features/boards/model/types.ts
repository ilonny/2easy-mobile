export type Board = {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  image_id?: string | number;
  image_path?: string;
  user_id: number;
  lesson_id?: number | null;
  canEdit?: boolean;
  'board_relations.id'?: number;
};

export type BoardFormFields = {
  title: string;
  description: string;
  tags: string;
};

export type LessonBoardScope = 'individual' | 'group';

export type LessonBoardScopeResponse = {
  success?: boolean;
  message?: string;
  anchor_lesson_id?: number;
  scope?: LessonBoardScope;
  scope_student_id?: number | null;
  room_key?: string;
};
