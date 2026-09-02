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
  /** Parent lesson id when this lesson is homework. */
  lesson_id_homework?: number | string | null;
  /** Resolved homework lesson id linked to this parent lesson. */
  homework_lesson_id?: number | string | null;
  has_individual_homework?: boolean | number | string | null;
  course_id?: number | null;
  is_free?: string | boolean | number | null;
  created_from_2easy?: number | boolean | null;
};

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
