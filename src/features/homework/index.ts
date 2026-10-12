export {
  checkHomework,
  createCommonHomework,
  createIndividualHomework,
  createMyHomework,
  getOrCreateHomeworkForStudent,
  resolveHomeworkForStudent,
  resolveHomeworkForStudentBatch,
} from './api/homeworkApi';
export type {
  HomeworkBatchResolveResult,
  HomeworkCheckResult,
  HomeworkCreateResult,
  HomeworkResolveResult,
} from './api/homeworkApi';
export {CreateHomeworkModal} from './ui/CreateHomeworkModal';
export {CreateIndividualHomeworkModal} from './ui/CreateIndividualHomeworkModal';
export {
  isHomeworkLesson,
  lessonHasHomeworkLink,
  openStudentHomework,
  openTeacherStudentHomework,
  startHomeworkSessionForStudent,
} from './lib/openHomework';
export type {HomeworkLessonFields} from './lib/openHomework';
export {positiveId} from './lib/exDisplay';
