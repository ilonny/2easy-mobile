import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {LessonsStackParamList} from '../../../app/navigation/types';
import {LessonEditorScreen} from '../../../features/lesson-editor';

type Props = NativeStackScreenProps<LessonsStackParamList, 'LessonEditor'>;

export function LessonEditorPage({route}: Props) {
  return (
    <LessonEditorScreen
      lessonId={route.params.lessonId}
      studentId={route.params.studentId}
    />
  );
}
