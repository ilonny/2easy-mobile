import {createContext, useContext} from 'react';

export type LessonPlayerContextValue = {
  lessonId: number;
  studentId?: number;
  activeStudentId?: number;
  isTeacher: boolean;
  isView: boolean;
  isEdit: boolean;
};

const LessonPlayerContext = createContext<LessonPlayerContextValue>({
  lessonId: 0,
  isTeacher: false,
  isView: true,
  isEdit: false,
});

export const LessonPlayerProvider = LessonPlayerContext.Provider;

export function useLessonPlayer() {
  return useContext(LessonPlayerContext);
}
