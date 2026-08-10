export type ExAttachment = {
  id?: number | string;
  path?: string;
  text?: string;
  dataURL?: string;
  file?: unknown;
};

export type ExCommonData = {
  id?: number;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  images?: ExAttachment[];
  editorImages?: ExAttachment[];
  secondEditorImages?: ExAttachment[];
  bgAttachments?: ExAttachment[];
  editorAttachments?: ExAttachment[];
  secondEditorAttachments?: ExAttachment[];
  attachments?: ExAttachment[];
  content?: string;
  viewType?: string;
  [key: string]: unknown;
};

export type Exercise = {
  id: number;
  lesson_id?: number;
  type: string;
  sortIndex: number;
  data: ExCommonData;
  is_visible?: string | number | boolean | null;
};

export type LessonDetail = {
  id: number;
  title?: string;
  description?: string;
  tags?: string;
  image_path?: string;
  user_id?: number;
  canEdit?: boolean;
  is_my_lesson?: boolean;
  is_homework?: boolean | number | string;
  course_id?: number | null;
};

export const ANSWER_EX_TYPES = new Set([
  'text-checklist',
  'fill-gaps-select',
  'fill-gaps-input',
  'fill-gaps-drag',
  'FILL_GAPS_NEW',
  'match-word-word',
  'match-word-image',
  'match-word-column',
  'test',
  'free-input-form',
]);

export type ExListChromeHandlers = {
  onPressEdit?: (ex: Exercise) => void;
  onPressDelete?: (exId: number) => void;
  changeSortIndex?: (exId: number, newIndex: number) => void;
  onChangeIsVisible?: (ex: Exercise) => void;
  onPressCreate?: (indexToShift?: number) => void;
  onPressCopy?: (ex: Exercise) => void;
  onPressPaste?: (indexToShift?: number) => void;
  /** True when exercise clipboard has a copied task. */
  hasClipboard?: boolean;
};
